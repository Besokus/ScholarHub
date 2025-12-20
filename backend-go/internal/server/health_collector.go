package server

import (
	"context"
	"log"
	"math"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
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
	ms := 30000
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
	pingURL := os.Getenv("PING_URL")
	netLatency := int64(0)
	if pingURL != "" {
		netLatency = pingLatency(pingURL, 800)
		if netLatency < 0 {
			netLatency = 0
		}
	}
	totalMs := time.Since(start).Milliseconds()

	severities := map[string]float64{
		"cpu":  severityCPU(cpuPerc),
		"mem":  severityMem(memPerc),
		"disk": severityDisk(diskPerc, diskClass()),
		"db":   severityDBLatency(dbLatency),
		"net":  severityNetworkLatency(netLatency),
		"svc":  severityServiceMs(totalMs),
	}
	baseWeights := map[string]float64{
		"cpu": 0.22, "mem": 0.22, "disk": 0.20, "db": 0.16, "net": 0.12, "svc": 0.08,
	}
	weights := dynamicWeights(baseWeights, severities)
	score := calcHealthScore(severities, weights)
	status := "Healthy"
	if score < 60 {
		status = "Critical"
	} else if score < 80 {
		status = "Warning"
	}
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
	log.Printf("health_collect status=%s score=%d endpointMs=%d cpu=%.1f mem=%.1f disk=%.1f db=%d net=%d",
		status, int(score+0.5), totalMs, cpuPerc, memPerc, diskPerc, dbLatency, netLatency)
}

func minf(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func piecewise(x float64, pts [][2]float64) float64 {
	if len(pts) == 0 {
		return 0
	}
	if x <= pts[0][0] {
		return pts[0][1]
	}
	if x >= pts[len(pts)-1][0] {
		return pts[len(pts)-1][1]
	}
	for i := 1; i < len(pts); i++ {
		x0, y0 := pts[i-1][0], pts[i-1][1]
		x1, y1 := pts[i][0], pts[i][1]
		if x >= x0 && x <= x1 {
			if x1 == x0 {
				return y1
			}
			r := (x - x0) / (x1 - x0)
			return y0 + r*(y1-y0)
		}
	}
	return pts[len(pts)-1][1]
}

func severityDisk(used float64, cls string) float64 {
	if strings.ToUpper(cls) == "HDD" {
		return piecewise(used, [][2]float64{
			{0, 0}, {50, 10}, {75, 40}, {90, 80}, {95, 95}, {100, 100},
		})
	}
	return piecewise(used, [][2]float64{
		{0, 0}, {60, 10}, {80, 30}, {90, 70}, {95, 90}, {100, 100},
	})
}

func severityCPU(p float64) float64 {
	return piecewise(p, [][2]float64{
		{0, 0}, {40, 10}, {60, 30}, {80, 65}, {90, 85}, {100, 100},
	})
}

func severityMem(p float64) float64 {
	return piecewise(p, [][2]float64{
		{0, 0}, {50, 10}, {70, 40}, {85, 75}, {95, 95}, {100, 100},
	})
}

func severityDBLatency(ms int64) float64 {
	return piecewise(float64(ms), [][2]float64{
		{0, 0}, {50, 5}, {200, 30}, {500, 60}, {1000, 90}, {2000, 100},
	})
}

func severityNetworkLatency(ms int64) float64 {
	if ms <= 0 {
		return 0
	}
	return piecewise(float64(ms), [][2]float64{
		{0, 0}, {20, 5}, {50, 20}, {100, 40}, {200, 70}, {500, 100},
	})
}

func severityServiceMs(ms int64) float64 {
	return piecewise(float64(ms), [][2]float64{
		{0, 0}, {50, 5}, {150, 20}, {300, 40}, {600, 80}, {1000, 100},
	})
}

func dynamicWeights(base map[string]float64, sev map[string]float64) map[string]float64 {
	sum := 0.0
	out := map[string]float64{}
	for k, w := range base {
		a := 0.5
		s := sev[k] / 100.0
		adj := w * (1 + a*s)
		out[k] = adj
		sum += adj
	}
	if sum <= 0 {
		return base
	}
	for k := range out {
		out[k] = out[k] / sum
	}
	return out
}

func calcHealthScore(sev map[string]float64, w map[string]float64) float64 {
	pen := 0.0
	for k, s := range sev {
		pen += s * (w[k])
	}
	score := 100.0 - pen
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}
	return math.Round(score*10) / 10
}

func diskClass() string {
	if v := os.Getenv("DISK_CLASS"); v != "" {
		return v
	}
	if v := os.Getenv("DISK_TYPE"); v != "" {
		return v
	}
	return "SSD"
}

func pingLatency(url string, timeoutMs int) int64 {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutMs)*time.Millisecond)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodHead, url, nil)
	t0 := time.Now()
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return -1
	}
	if resp != nil && resp.Body != nil {
		_ = resp.Body.Close()
	}
	return time.Since(t0).Milliseconds()
}
