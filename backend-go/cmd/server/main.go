package main

import (
    "log"
    "os"
    "time"
    "github.com/gin-gonic/gin"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "scholarhub/backend-go/internal/server"
)

func main() {
    dsn := os.Getenv("DATABASE_URL")
    if dsn == "" {
        log.Fatal("DATABASE_URL missing")
    }
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal(err)
    }
    r := gin.Default()
    r.Use(server.CORS())
    server.RegisterStatic(r)
    server.RegisterRoutes(r, db)
    port := os.Getenv("PORT")
    if port == "" { port = "3000" }
    s := &httpServer{r: r, addr: ":" + port}
    s.run()
}

type httpServer struct{ r *gin.Engine; addr string }

func (s *httpServer) run() {
    srv := &serverRunner{engine: s.r, addr: s.addr}
    srv.start()
}

type serverRunner struct{ engine *gin.Engine; addr string }

func (s *serverRunner) start() {
    go func() { _ = s.engine.Run(s.addr) }()
    time.Sleep(100 * time.Millisecond)
}

