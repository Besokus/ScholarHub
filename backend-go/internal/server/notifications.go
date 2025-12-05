package server

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "scholarhub/backend-go/internal/models"
)

type NotificationsController struct{ db *gorm.DB }

func NewNotificationsController(db *gorm.DB) *NotificationsController { return &NotificationsController{db: db} }

func (n *NotificationsController) Unread(c *gin.Context) {
    uid := c.GetInt("user_id")
    var list []models.Notification
    n.db.Where("\"userId\" = ? AND read = false", uid).Order("\"createTime\" desc").Find(&list)
    c.JSON(http.StatusOK, respOk(gin.H{"items": list}))
}

func (n *NotificationsController) Read(c *gin.Context) {
    id := c.Param("id")
    n.db.Model(&models.Notification{}).Where("id = ?", id).Update("read", true)
    c.JSON(http.StatusOK, respOk(gin.H{"ok": true}))
}

func (n *NotificationsController) ReadAll(c *gin.Context) {
    uid := c.GetInt("user_id")
    n.db.Model(&models.Notification{}).Where("\"userId\" = ?", uid).Update("read", true)
    c.JSON(http.StatusOK, respOk(gin.H{"ok": true}))
}

