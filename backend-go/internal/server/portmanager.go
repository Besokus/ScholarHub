package server

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
)

type PortConfig struct {
	Preferred int
	RangeMin  int
	RangeMax  int
}

type PortManager struct {
	cfg PortConfig
}

var listenFn = net.Listen

func LoadPortConfig() PortConfig {
	pref := 4000
	if v := strings.TrimSpace(os.Getenv("ADMIN_PORT")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n < 65536 {
			pref = n
		}
	}
	min := 0
	max := 0
	if v := strings.TrimSpace(os.Getenv("ADMIN_PORT_RANGE")); v != "" {
		parts := strings.SplitN(v, "-", 2)
		if len(parts) == 2 {
			if a, err1 := strconv.Atoi(strings.TrimSpace(parts[0])); err1 == nil {
				if b, err2 := strconv.Atoi(strings.TrimSpace(parts[1])); err2 == nil {
					if a > 0 && a < 65536 && b > 0 && b < 65536 && a <= b {
						min = a
						max = b
					}
				}
			}
		}
	}
	return PortConfig{Preferred: pref, RangeMin: min, RangeMax: max}
}

func NewPortManager(cfg PortConfig) *PortManager {
	return &PortManager{cfg: cfg}
}

func (p *PortManager) GetListener() (net.Listener, int, error) {
	tried := []int{}
	lastErr := error(nil)
	l, err := listenFn("tcp", fmt.Sprintf(":%d", p.cfg.Preferred))
	if err == nil {
		return l, p.cfg.Preferred, nil
	}
	lastErr = err
	tried = append(tried, p.cfg.Preferred)
	if p.cfg.RangeMin <= 0 || p.cfg.RangeMax <= 0 || p.cfg.RangeMin > p.cfg.RangeMax {
		return nil, 0, fmt.Errorf("admin preferred port %d unavailable and no fallback range configured, tried=%v, last error=%v", p.cfg.Preferred, tried, lastErr)
	}
	for port := p.cfg.RangeMin; port <= p.cfg.RangeMax; port++ {
		if port == p.cfg.Preferred {
			continue
		}
		ll, e := listenFn("tcp", fmt.Sprintf(":%d", port))
		if e == nil {
			return ll, port, nil
		}
		lastErr = e
		tried = append(tried, port)
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("no ports tried")
	}
	return nil, 0, fmt.Errorf("no available admin port, preferred=%d, range=%d-%d, tried=%v, last error=%v", p.cfg.Preferred, p.cfg.RangeMin, p.cfg.RangeMax, tried, lastErr)
}
