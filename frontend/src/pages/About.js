import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css'; // Reuse existing styles

function About() {
  return (
    <div className="home-container" style={{textAlign:'center', paddingTop:'50px'}}>
      <div className="card" style={{maxWidth:'600px', margin:'0 auto'}}>
        <h1 style={{color:'#764ba2'}}>About ExpenseTracker</h1>
        <p style={{fontSize:'16px', lineHeight:'1.6', color:'#555'}}>
          This project was built as part of a <strong>MERN Stack College Evaluation</strong>. 
          It allows users to track their daily financial activities with security and ease.
        </p>
        
        <div style={{textAlign:'left', marginTop:'30px'}}>
          <h3>🚀 Tech Stack:</h3>
          <ul style={{color:'#666'}}>
            <li><strong>MongoDB:</strong> Database for storing financial records.</li>
            <li><strong>Express & Node.js:</strong> Backend API & Security.</li>
            <li><strong>React.js:</strong> Frontend User Interface.</li>
          </ul>
        </div>

        <div style={{marginTop:'40px'}}>
          <Link to="/" className="btn-logout" style={{textDecoration:'none', background:'#764ba2', color:'white'}}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default About;