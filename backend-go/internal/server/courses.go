package server

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "scholarhub/backend-go/internal/models"
)

type CoursesController struct{ db *gorm.DB }

func NewCoursesController(db *gorm.DB) *CoursesController { return &CoursesController{db: db} }

func (cc *CoursesController) List(c *gin.Context) {
    var list []models.Course
    cc.db.Select("id, name").Order("name asc").Find(&list)
    c.JSON(http.StatusOK, respOk(gin.H{"items": list}))
}

