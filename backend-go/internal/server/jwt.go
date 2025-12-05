package server

import (
    "net/http"
    "os"
    "strings"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v4"
)

func JWT() gin.HandlerFunc {
    return func(c *gin.Context) {
        auth := c.GetHeader("Authorization")
        parts := strings.Split(auth, " ")
        if len(parts) != 2 { c.JSON(http.StatusUnauthorized, respErr(1001, "unauthorized")); c.Abort(); return }
        tokenStr := parts[1]
        secret := os.Getenv("JWT_SECRET")
        t, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) { return []byte(secret), nil })
        if err != nil || !t.Valid { c.JSON(http.StatusUnauthorized, respErr(1001, "unauthorized")); c.Abort(); return }
        claims, ok := t.Claims.(jwt.MapClaims)
        if !ok { c.JSON(http.StatusUnauthorized, respErr(1001, "unauthorized")); c.Abort(); return }
        c.Set("user_id", claims["uid"])
        c.Set("role", claims["role"])
        c.Next()
    }
}

func signJWT(uid interface{}, role string) (string, error) {
    secret := os.Getenv("JWT_SECRET")
    ttlStr := os.Getenv("JWT_TTL")
    ttl := time.Hour * 24 * 7
    if ttlStr != "" { ttl = time.Hour * 24 }
    claims := jwt.MapClaims{"uid": uid, "role": role, "exp": time.Now().Add(ttl).Unix()}
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secret))
}

type apiResp struct{ Code int; Msg string; Data interface{} }

func respOk(data interface{}) apiResp { return apiResp{Code: 0, Msg: "success", Data: data} }
func respErr(code int, msg string) apiResp { return apiResp{Code: code, Msg: msg, Data: nil} }

