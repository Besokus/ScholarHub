package server

import (
	"log"
	"os"
	"runtime"
	"strconv"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"gorm.io/gorm"

	"scholarhub/backend-go/internal/models"
)

var (
	subMu = &sync.Mutex{}
	subs  = map[chan models.HealthSample]struct{}{}
)

func SubscribeHealth() chan models.HealthSample {
	ch := make(chan models.HealthSample, 8)
	subMu.Lock()
	subs[ch] = struct{}{}
	subMu.Unlock()
	return ch
}

func UnsubscribeHealth(ch chan models.HealthSample) {
	subMu.Lock()
	delete(subs, ch)
	close(ch)
	subMu.Unlock()
}

func publishHealth(s models.HealthSample) {
	subMu.Lock()
	for ch := range subs {
		select {
		case ch <- s:
		default:
		}
	}
	subMu.Unlock()
}

type HealthCollector struct {
	db       *gorm.DB
	interval time.Duration
	stopCh   chan struct{}
	lastBeat time.Time
}

func NewHealthCollector(db *gorm.DB) *HealthCollector {
	ms := 5000
	if v := os.Getenv("HEALTH_INTERVAL_MS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			ms = n
		}
	}
	return &HealthCollector{db: db, interval: time.Duration(ms) * time.Millisecond, stopCh: make(chan struct{}, 1)}
}

func (hc *HealthCollector) Start() {
	hc.startRetention(30)
	go func() {
		for {
			func() {
				defer func() {
					if r := recover(); r != nil {
						log.Printf("health_collector panic: %v", r)
						time.Sleep(2 * time.Second)
					}
				}()
				hc.run()
			}()
			select {
			case <-hc.stopCh:
				return
			default:
			}
			time.Sleep(1 * time.Second)
		}
	}()
}

func (hc *HealthCollector) startRetention(days int) {
	go func() {
		t := time.NewTicker(1 * time.Hour)
		defer t.Stop()
		for {
			cutoff := time.Now().AddDate(0, 0, -days)
			_ = hc.db.Where("\"createTime\" < ?", cutoff).Delete(&models.HealthSample{}).Error
			select {
			case <-t.C:
			case <-hc.stopCh:
				return
			}
		}
	}()
}

func (hc *HealthCollector) run() {
	t := time.NewTicker(hc.interval)
	defer t.Stop()
	for {
		hc.sampleOnce()
		hc.lastBeat = time.Now()
		select {
		case <-t.C:
		case <-hc.stopCh:
			return
		}
	}
}

func (hc *HealthCollector) sampleOnce() {
	start := time.Now()
	cpuPerc := 0.0
	if vals, err := cpu.Percent(time.Millisecond*200, false); err == nil && len(vals) > 0 {
		cpuPerc = vals[0]
	}
	memPerc := 0.0
	if m, err := mem.VirtualMemory(); err == nil {
		memPerc = m.UsedPercent
	}
	root := "/"
	if runtime.GOOS == "windows" {
		drive := os.Getenv("SYSTEMDRIVE")
		if drive == "" {
			drive = "C:"
		}
		root = drive + "\\"
	}
	diskPerc := 0.0
	if du, err := disk.Usage(root); err == nil && du != nil {
		diskPerc = du.UsedPercent
	}
	dbStart := time.Now()
	_ = hc.db.Exec("SELECT 1")
	dbLatency := time.Since(dbStart).Milliseconds()
	latScore := 0.0
	if dbLatency <= 50 {
		latScore = 0
	} else if dbLatency >= 1000 {
		latScore = 100
	} else {
		latScore = (float64(dbLatency) - 50) / 950 * 100
	}
	score := 100.0 - (minf(cpuPerc, 100)*0.3 + minf(memPerc, 100)*0.3 + minf(diskPerc, 100)*0.2 + minf(latScore, 100)*0.2)
	if score < 0 {
		score = 0
	}
	status := "Healthy"
	if score < 60 {
		status = "Critical"
	} else if score < 80 {
		status = "Warning"
	}
	totalMs := time.Since(start).Milliseconds()
	sample := models.HealthSample{
		Score:       int(score + 0.5),
		Status:      status,
		CpuUsed:     cpuPerc,
		MemUsed:     memPerc,
		DiskUsed:    diskPerc,
		DbLatencyMs: dbLatency,
		EndpointMs:  totalMs,
	}
	_ = hc.db.Create(&sample)
	publishHealth(sample)
	log.Printf("health_collect status=%s score=%d endpointMs=%d cpu=%.1f mem=%.1f disk=%.1f db=%d",
		status, int(score+0.5), totalMs, cpuPerc, memPerc, diskPerc, dbLatency)
}

func minf(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
