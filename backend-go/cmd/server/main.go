package main

import (
	"log"
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
	port := os.Getenv("ADMIN_PORT")
	if port == "" {
		port = "3000"
	}
	s := &httpServer{r: r, addr: ":" + port}
	s.run()
}

type httpServer struct {
	r    *gin.Engine
	addr string
}

func (s *httpServer) run() {
	srv := &serverRunner{engine: s.r, addr: s.addr}
	srv.start()
}

type serverRunner struct {
	engine *gin.Engine
	addr   string
}

func (s *serverRunner) start() {
	_ = s.engine.Run(s.addr)
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
