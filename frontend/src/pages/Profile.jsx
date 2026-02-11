import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';


// --- HARDCODED URL FIX ---
// This ensures we always talk to the right server, bypassing the "proxy" issues
const API_URL = "http://localhost:5000/api/v1/auth";;

function Profile() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState(''); // 'success' or 'error'

    // Load user data when the page opens
    useEffect(() => {
        getUser();
    }, []);

    const getUser = async () => {
        try {
            // We use { withCredentials: true } to send the HTTP-only cookie
            const res = await axios.get(`${API_URL}/me`, { withCredentials: true });
            
            // Set the state with the data from the backend
            setName(res.data.data.name);
            setEmail(res.data.data.email);
        } catch (error) {
            console.error("Error fetching user:", error);
            setAlertMessage("Could not load user data.");
            setAlertType('error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAlertMessage('');

        try {
            // Send the update request
            const res = await axios.put(
                `${API_URL}/updatedetails`, 
                { name, email }, 
                { withCredentials: true } // CRITICAL: This sends your login token
            );

            // Update success
            setAlertMessage("Profile Updated Successfully! ✅");
            setAlertType('success');
            
            // Optional: Update the inputs with the new confirmed data
            setName(res.data.data.name);
            setEmail(res.data.data.email);

        } catch (error) {
            console.error("Update Error:", error.response ? error.response.data : error.message);
            setAlertMessage("Failed to update profile. ❌");
            setAlertType('error');
        }
    };

    return (
        <ProfileStyled>
            <div className="profile-container">
                <h2>Account Settings</h2>
                
                {/* Alert Message Box */}
                {alertMessage && (
                    <div className={`alert ${alertType}`}>
                        {alertMessage}
                    </div>
                )}

                <div className="profile-card">
                    <div className="avatar-section">
                        <div className="avatar">
                            {name ? name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="user-info">
                            <h3>{name}</h3>
                            <p>{email}</p>
                            <span className="badge">Active Member</span>
                        </div>
                    </div>

                    <form className="form-section" onSubmit={handleSubmit}>
                        <div className="input-control">
                            <label>Full Name</label>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                placeholder="Enter your name"
                            />
                        </div>

                        <div className="input-control">
                            <label>Email Address</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="Enter your email"
                            />
                        </div>

                        <button className="submit-btn" type="submit">
                            Update Profile
                        </button>
                    </form>
                </div>
            </div>
        </ProfileStyled>
    );
}

// --- STYLES (Matches your screenshot) ---
const ProfileStyled = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;

    .profile-container {
        width: 100%;
        max-width: 600px;
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    h2 {
        color: rgba(255, 255, 255, 0.8);
    }

    .alert {
        padding: 1rem;
        border-radius: 10px;
        color: white;
        text-align: center;
        font-weight: bold;
    }
    .alert.success { background: #27ae60; }
    .alert.error { background: #e74c3c; }

    .profile-card {
        background: #fcf6f9;
        border: 2px solid #FFFFFF;
        box-shadow: 0px 1px 15px rgba(0, 0, 0, 0.06);
        border-radius: 20px;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .avatar-section {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-bottom: 1rem;
        
        .avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #2a2a2a;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            font-weight: bold;
            box-shadow: 0px 1px 15px rgba(0,0,0,0.2);
        }

        .user-info {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;

            h3 { font-size: 1.5rem; color: #222; margin: 0; }
            p { color: #666; margin: 0; }
            .badge {
                background: #27ae60;
                color: white;
                padding: 0.2rem 0.8rem;
                border-radius: 20px;
                font-size: 0.8rem;
                width: fit-content;
                margin-top: 0.5rem;
            }
        }
    }

    .form-section {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .input-control {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        label {
            font-size: 0.9rem;
            font-weight: 600;
            color: #333;
        }

        input {
            font-family: inherit;
            font-size: inherit;
            outline: none;
            border: none;
            padding: .8rem 1rem;
            border-radius: 10px;
            border: 1px solid rgba(34, 34, 96, 0.1);
            background: rgba(255, 255, 255, 0.6);
            color: rgba(34, 34, 96, 0.9);
            box-shadow: 0px 1px 15px rgba(0, 0, 0, 0.06);
            transition: all .3s ease-in-out;
            
            &:focus {
                border-color: #27ae60;
                background: white;
            }
        }
    }

    .submit-btn {
        padding: 1rem;
        border-radius: 10px;
        background: #222;
        color: white;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.3s ease;
        margin-top: 1rem;

        &:hover {
            background: #27ae60;
            transform: translateY(-2px);
        }
    }
`;

export default Profile;