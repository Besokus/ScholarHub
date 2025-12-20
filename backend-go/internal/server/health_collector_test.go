package server

import (
	"os"
	"testing"
	"time"

	"gorm.io/gorm"
)

type dummyDB struct{ gorm.DB }

func TestDefaultInterval(t *testing.T) {
	_ = os.Unsetenv("HEALTH_INTERVAL_MS")
	hc := NewHealthCollector(&gorm.DB{})
	if hc.interval != 30*time.Second {
		t.Fatalf("expected default interval 30s, got %v", hc.interval)
	}
}

func TestEnvOverrideInterval(t *testing.T) {
	_ = os.Setenv("HEALTH_INTERVAL_MS", "5000")
	hc := NewHealthCollector(&gorm.DB{})
	if hc.interval != 5*time.Second {
		t.Fatalf("expected interval 5s from env, got %v", hc.interval)
	}
}

func TestMinf(t *testing.T) {
	if minf(3.0, 5.0) != 3.0 {
		t.Fatalf("minf failed for (3,5)")
	}
	if minf(10.0, 2.0) != 2.0 {
		t.Fatalf("minf failed for (10,2)")
	}
}

func TestSeverityDiskSSD(t *testing.T) {
	s := severityDisk(70, "SSD")
	if s < 20 || s > 40 {
		t.Fatalf("expected SSD severity ~30 for 70%% used, got %f", s)
	}
	s2 := severityDisk(95, "SSD")
	if s2 < 85 {
		t.Fatalf("expected SSD severity high near 95%% used, got %f", s2)
	}
}

func TestDynamicWeightsNormalize(t *testing.T) {
	base := map[string]float64{"cpu": 0.22, "mem": 0.22, "disk": 0.20, "db": 0.16, "net": 0.12, "svc": 0.08}
	sev := map[string]float64{"cpu": 30, "mem": 40, "disk": 50, "db": 10, "net": 0, "svc": 5}
	w := dynamicWeights(base, sev)
	sum := 0.0
	for _, v := range w {
		sum += v
	}
	if sum < 0.999 || sum > 1.001 {
		t.Fatalf("weights must normalize to 1, got %f", sum)
	}
}
