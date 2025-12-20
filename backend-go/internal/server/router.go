package server

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.Status(http.StatusOK)
			c.Abort()
			return
		}
		c.Next()
	}
}

func RegisterStatic(r *gin.Engine) {
	dir := os.Getenv("UPLOAD_DIR")
	if dir == "" {
		dir = "uploads"
	}
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		_ = os.MkdirAll(dir, 0755)
	}
	r.Static("/uploads", dir)
}

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	api := r.Group("/api")
	auth := NewAuthController(db)
	api.POST("/auth/register", auth.Register)
	api.POST("/auth/login", auth.Login)
	api.GET("/auth/me", auth.Me)

	courses := NewCoursesController(db)
	api.GET("/courses", courses.List)

	uploads := NewUploadsController()
	api.POST("/uploads/files", uploads.File)
	api.POST("/uploads/images", uploads.Images)

	jwt := JWT()
	res := NewResourcesController(db)
	qa := NewQAController(db)
	noti := NewNotificationsController(db)
	announce := NewAnnouncementsController(db)
	p := api.Group("")
	p.Use(jwt)
	p.GET("/resources", res.List)
	p.GET("/resources/:id", res.Detail)
	p.POST("/resources", res.Create)
	p.POST("/resources/:id/downloads", res.Download)
	p.GET("/resources/downloads/me", res.MyDownloads)
	p.GET("/resources/me/uploads", res.MyUploads)

	p.GET("/qa/questions", qa.List)
	p.GET("/qa/questions/:id", qa.Detail)
	p.POST("/qa/questions", qa.Create)

	p.GET("/notifications", noti.Unread)
	p.POST("/notifications/:id/read", noti.Read)
	p.POST("/notifications/read-all", noti.ReadAll)
	p.GET("/announcements", announce.PublicList)
	p.GET("/announcements/:id", announce.PublicDetail)
	p.POST("/announcements/:id/read", announce.PublicMarkRead)
	p.POST("/announcements/read-batch", announce.PublicBatchMarkRead)
	p.POST("/announcements/:id/fav", announce.PublicToggleFavorite)
	p.GET("/announcements/unread-count", announce.PublicUnreadCount)

	adm := api.Group("/admin")
	adm.Use(jwt, RequireAdmin())
	admin := NewAdminController(db)
	adm.GET("/stats", admin.Stats)
	adm.GET("/health", admin.Health)
	adm.GET("/health/trend", admin.HealthTrend)
	adm.GET("/health/samples", admin.HealthSamples)
	adm.GET("/health/stream", admin.HealthStream)
	adm.GET("/service/status", admin.ServiceStatus)
	adm.GET("/teachers", admin.ListTeachers)
	adm.POST("/teachers", admin.CreateTeacher)
	adm.PUT("/teachers/:id", admin.UpdateTeacher)
	adm.DELETE("/users/:id", admin.DeleteUser)

	adm.GET("/resources", admin.ListAuditResources)
	adm.PUT("/resources/:id", admin.AuditResource)
	adm.DELETE("/resources/:id", admin.DeleteResource)

	adm.GET("/questions", admin.ListAuditQuestions)
	adm.PUT("/questions/:id", admin.AuditQuestion)
	adm.PUT("/answers/:id", admin.AuditAnswer)
	adm.GET("/announcements", announce.AdminList)
	adm.POST("/announcements", announce.AdminCreate)
	adm.PUT("/announcements/:id", announce.AdminUpdate)
	adm.DELETE("/announcements/:id", announce.AdminDelete)
}
