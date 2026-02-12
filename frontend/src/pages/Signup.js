import React, { useState } from 'react';
import { useGlobalContext } from '../context/globalContext';
import { Link } from 'react-router-dom';

function Signup() {
    const { registerUser, error } = useGlobalContext();
    const [form, setForm] = useState({ name: '', email: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await registerUser(form);
    };

    return (
        <div>
            <h2>Signup</h2>
            {error && <p style={{color: 'red'}}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Name" onChange={e => setForm({...form, name: e.target.value})} />
                <input type="email" placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} />
                <input type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} />
                <button type="submit">Register</button>
            </form>
            <p><Link to="/login">Login Here</Link></p>
        </div>
    );
}
export default Signup;