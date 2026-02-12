import React, { useState } from 'react';
import { useGlobalContext } from '../context/globalContext';
import { Link } from 'react-router-dom';

function Login() {
    const { loginUser, error } = useGlobalContext();
    const [form, setForm] = useState({ email: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await loginUser(form);
    };

    return (
        <div>
            <h2>Login</h2>
            {error && <p style={{color: 'red'}}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <input type="email" placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} />
                <input type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} />
                <button type="submit">Login</button>
            </form>
            <p><Link to="/signup">Signup Here</Link></p>
        </div>
    );
}
export default Login;