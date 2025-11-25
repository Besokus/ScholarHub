import React, { useState } from 'react';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || '注册失败');
        return;
      }
      setMessage('注册成功，请前往登录');
    } catch (err) {
      setMessage('网络错误');
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '2rem auto' }}>
      <h2>注册</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <input placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <select value={role} onChange={(e) => setRole(e.target.value as 'STUDENT' | 'TEACHER')}>
            <option value="STUDENT">学生</option>
            <option value="TEACHER">教师</option>
          </select>
        </div>
        <button type="submit">注册</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Register;
