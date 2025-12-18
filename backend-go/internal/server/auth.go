package server

import (
	"net/http"
	"scholarhub/backend-go/internal/models"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthController struct{ db *gorm.DB }

func NewAuthController(db *gorm.DB) *AuthController { return &AuthController{db: db} }

func (a *AuthController) Register(c *gin.Context) {
	var req struct {
		Username string
		Email    string
		Password string
		Role     string
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, respErr(1002, "bad_request"))
		return
	}
	if req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, respErr(1002, "bad_request"))
		return
	}
	var exist models.User
	if err := a.db.Where("username = ?", req.Username).First(&exist).Error; err == nil {
		c.JSON(http.StatusConflict, respErr(1003, "exists"))
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	u := models.User{Username: req.Username, Email: req.Email, Password: string(hash), Role: strings.ToUpper(req.Role)}
	if u.Role == "" {
		u.Role = "STUDENT"
	}
	if err := a.db.Create(&u).Error; err != nil {
		c.JSON(http.StatusInternalServerError, respErr(1004, "db_error"))
		return
	}
	c.JSON(http.StatusOK, respOk(gin.H{"id": u.ID}))
}

func (a *AuthController) Login(c *gin.Context) {
	var req struct {
		Username string
		Password string
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, respErr(1002, "bad_request"))
		return
	}
	var u models.User
	if err := a.db.Where("username = ?", req.Username).First(&u).Error; err != nil {
		c.JSON(http.StatusUnauthorized, respErr(1001, "unauthorized"))
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(req.Password)) != nil {
		c.JSON(http.StatusUnauthorized, respErr(1001, "unauthorized"))
		return
	}
	t, err := signJWT(u.ID, u.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, respErr(1005, "token_error"))
		return
	}
	c.JSON(http.StatusOK, respOk(gin.H{"token": t, "user": gin.H{"id": u.ID, "username": u.Username, "role": u.Role}}))
}

func (a *AuthController) Me(c *gin.Context) {
	uid := c.GetString("user_id")
	var u models.User
	if err := a.db.First(&u, "id = ?", uid).Error; err != nil {
		c.JSON(http.StatusNotFound, respErr(1006, "not_found"))
		return
	}
	c.JSON(http.StatusOK, respOk(gin.H{"id": u.ID, "username": u.Username, "email": u.Email, "role": u.Role}))
}
