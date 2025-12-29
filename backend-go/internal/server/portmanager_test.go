package server

import (
	"errors"
	"net"
	"os"
	"testing"
)

type dummyListener struct {
	addr net.Addr
}

func (d *dummyListener) Accept() (net.Conn, error) { return nil, errors.New("not implemented") }
func (d *dummyListener) Close() error              { return nil }
func (d *dummyListener) Addr() net.Addr            { return d.addr }

func withListenStub(t *testing.T, fn func(network, addr string) (net.Listener, error), body func()) {
	orig := listenFn
	listenFn = fn
	defer func() { listenFn = orig }()
	body()
}

func TestLoadPortConfigDefaults(t *testing.T) {
	_ = os.Unsetenv("ADMIN_PORT")
	_ = os.Unsetenv("ADMIN_PORT_RANGE")
	cfg := LoadPortConfig()
	if cfg.Preferred != 4000 {
		t.Fatalf("expected preferred 4000, got %d", cfg.Preferred)
	}
	if cfg.RangeMin != 0 || cfg.RangeMax != 0 {
		t.Fatalf("expected no fallback range when ADMIN_PORT_RANGE unset, got %d-%d", cfg.RangeMin, cfg.RangeMax)
	}
}

func TestLoadPortConfigFromEnv(t *testing.T) {
	_ = os.Setenv("ADMIN_PORT", "4500")
	_ = os.Setenv("ADMIN_PORT_RANGE", "4501-4505")
	cfg := LoadPortConfig()
	if cfg.Preferred != 4500 {
		t.Fatalf("expected preferred 4500, got %d", cfg.Preferred)
	}
	if cfg.RangeMin != 4501 || cfg.RangeMax != 4505 {
		t.Fatalf("expected range 4501-4505, got %d-%d", cfg.RangeMin, cfg.RangeMax)
	}
}

func TestGetListenerPreferredAvailable(t *testing.T) {
	cfg := PortConfig{Preferred: 4000, RangeMin: 4001, RangeMax: 4003}
	pm := NewPortManager(cfg)
	withListenStub(t, func(network, addr string) (net.Listener, error) {
		if addr == ":4000" {
			return &dummyListener{}, nil
		}
		return nil, errors.New("busy")
	}, func() {
		ln, port, err := pm.GetListener()
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if ln == nil {
			t.Fatalf("expected listener, got nil")
		}
		if port != 4000 {
			t.Fatalf("expected port 4000, got %d", port)
		}
	})
}

func TestGetListenerFallbackInRange(t *testing.T) {
	cfg := PortConfig{Preferred: 4000, RangeMin: 4001, RangeMax: 4003}
	pm := NewPortManager(cfg)
	withListenStub(t, func(network, addr string) (net.Listener, error) {
		if addr == ":4002" {
			return &dummyListener{}, nil
		}
		return nil, errors.New("busy")
	}, func() {
		ln, port, err := pm.GetListener()
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if ln == nil {
			t.Fatalf("expected listener, got nil")
		}
		if port != 4002 {
			t.Fatalf("expected port 4002, got %d", port)
		}
	})
}

func TestGetListenerAllBusy(t *testing.T) {
	cfg := PortConfig{Preferred: 4000, RangeMin: 4001, RangeMax: 4002}
	pm := NewPortManager(cfg)
	withListenStub(t, func(network, addr string) (net.Listener, error) {
		return nil, errors.New("busy")
	}, func() {
		ln, port, err := pm.GetListener()
		if err == nil {
			t.Fatalf("expected error when all ports busy")
		}
		if ln != nil {
			t.Fatalf("expected nil listener when all ports busy")
		}
		if port != 0 {
			t.Fatalf("expected port 0 on error, got %d", port)
		}
	})
}
