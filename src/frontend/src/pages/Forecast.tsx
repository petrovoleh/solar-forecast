import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Forecast: React.FC = () => {
    return (
        <div className="home-container">

            <section className="hero-section">
                <h2>Harness the Power of Solar Energy</h2>
                <p>Discover how much energy your solar panels can produce based on real-time data and unique algorithms.</p>
                <Link to="/forecast" className="cta-button">Get Forecast</Link>
            </section>

            <section className="stats-section">
                <div className="stat-item">
                    <h3>5,000+</h3>
                    <p>Forecasts Generated</p>
                </div>
                <div className="stat-item">
                    <h3>95%</h3>
                    <p>Prediction Accuracy</p>
                </div>
                <div className="stat-item">
                    <h3>1,200</h3>
                    <p>Solar Panels Monitored</p>
                </div>
            </section>

            <section className="features-section">
                <h2>Why Use Our Forecasting System?</h2>
                <div className="feature-card">
                    <h3>Real-Time Data</h3>
                    <p>We use real-time weather and environmental data to ensure accurate predictions for your solar panels.</p>
                </div>
                <div className="feature-card">
                    <h3>Custom Algorithms</h3>
                    <p>Our algorithms are specifically designed to forecast solar energy production based on panel location and configuration.</p>
                </div>
                <div className="feature-card">
                    <h3>Comprehensive Dashboard</h3>
                    <p>Monitor your energy production trends and forecasts in one easy-to-use dashboard.</p>
                </div>
            </section>

            <section className="testimonials-section">
                <h2>What Users Are Saying</h2>
                <div className="testimonial">
                    <p>"This tool has drastically improved our solar energy production efficiency!"</p>
                    <p>- Jane Doe, Solar Panel Owner</p>
                </div>
                <div className="testimonial">
                    <p>"The prediction accuracy is outstanding, and the dashboard is super intuitive."</p>
                    <p>- John Smith, Solar Technician</p>
                </div>
            </section>


        </div>
    );
};

export default Forecast;
