import React, { useState } from 'react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Login failed');
        return;
      }
      localStorage.setItem('token', data.token);
      setMessage('登录成功');
    } catch (err) {
      setMessage('网络错误');
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '2rem auto' }}>
      <h2>登录</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit">登录</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Login;
