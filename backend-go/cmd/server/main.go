package main

import (
	"log"
	"net"
	"net/http"
	"os"
	"scholarhub/backend-go/internal/models"
	"scholarhub/backend-go/internal/server"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	loadEnv()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL missing")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}
	if sqlDB, err := db.DB(); err == nil {
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(50)
		sqlDB.SetConnMaxLifetime(time.Minute * 10)
	}
	if err := db.AutoMigrate(&models.HealthSample{}); err != nil {
		log.Printf("AutoMigrate HealthSample skipped: %v", err)
	}
	hc := server.NewHealthCollector(db)
	hc.Start()
	log.Printf("health_collector started")
	r := gin.Default()
	r.Use(server.CORS())
	server.RegisterStatic(r)
	server.RegisterRoutes(r, db)
	pc := server.LoadPortConfig()
	pm := server.NewPortManager(pc)
	ln, port, err := pm.GetListener()
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("admin server listening on :%d", port)
	s := &httpServer{r: r, ln: ln}
	s.run()
}

type httpServer struct {
	r  *gin.Engine
	ln net.Listener
}

func (s *httpServer) run() {
	srv := &serverRunner{engine: s.r, ln: s.ln}
	srv.start()
}

type serverRunner struct {
	engine *gin.Engine
	ln     net.Listener
}

func (s *serverRunner) start() {
	srv := &http.Server{Handler: s.engine}
	_ = srv.Serve(s.ln)
}

func loadEnv() {
	paths := []string{"../server/.env", "../../server/.env", "server/.env", ".env"}
	for _, p := range paths {
		if _, err := os.Stat(p); err == nil {
			_ = godotenv.Load(p)
			break
		}
	}
}
