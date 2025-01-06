// Home.tsx
import React from 'react';

const Home: React.FC = () => {
    return (
        <div className="home-container">
            {/* Hero Section */}
            <section className="hero-section">
                <h2>Solar Energy Forecasting Platform</h2>
                <p>
                    This web-based application is part of a Bachelor's Thesis project focusing on predicting
                    daily solar energy production using weather forecasts. By combining real-time meteorological
                    data with advanced machine learning models, the system offers reliable forecasts that help
                    users make well-informed decisions about installing or optimizing solar panels.
                </p>
            </section>

            {/* Key Components Section */}
            <section className="features-section" aria-labelledby="key-components-title">
                <h2 id="key-components-title">Key Components</h2>
                    <p>
                        • <strong>Neural Network Service:</strong>
                        A Python-based FastAPI service trained on historical and real-time weather data to
                        generate solar power output predictions.
                    </p>
                    <p>
                        • <strong>Backend (Java Spring Boot):</strong>
                        Orchestrates data flow, manages user profiles, stores daily forecasts, and enforces
                        security and access control.
                    </p>
                    <p>
                        • <strong>Frontend (React + TypeScript):</strong>
                        A user-friendly interface for visualizing forecasts, adding panels, and tracking
                        solar energy trends.
                    </p>
                    <p>
                        • <strong>MongoDB Database:</strong>
                        Stores user, panel, and forecast data for quick retrieval and long-term analysis.
                    </p>
            </section>

            {/* Core Features Section */}
            <section className="hero-section" aria-labelledby="core-features-title">
                <h2 id="core-features-title">Core Features</h2>
                <p>• Bar or graph-based energy forecasts for individual panels or entire clusters.</p>
                <p>• Manage solar panel data (capacity, efficiency, and location).</p>
                <p>• Real-time weather-based predictions powered by advanced machine learning.</p>
                <p>• Multilingual interface (Lithuanian, English, Ukrainian) for wider accessibility.</p>
            </section>
            

            {/* Key Highlights Section */}
            <section className="features-section" aria-labelledby="key-highlights-title">
                <h2 id="key-highlights-title">Key Highlights</h2>

                <div className="feature-card">
                    <h3>Academic Excellence</h3>
                    <p>
                        A culmination of thorough research and practical implementation, blending machine
                        learning with software engineering principles for real-world applications.
                    </p>
                </div>

                <div className="feature-card">
                    <h3>Purpose-Built for Solar Forecasting</h3>
                    <p>
                        Integrates neural network models trained on extensive datasets to predict solar
                        energy output with high accuracy, serving as a vital tool for renewable energy
                        planning and optimization.
                    </p>
                </div>

                <div className="feature-card">
                    <h3>Comprehensive Data Integration</h3>
                    <p>
                        Merges real-time weather forecasts, historical energy production, and geospatial
                        metadata to generate reliable, in-depth predictions.
                    </p>
                </div>

                <div className="feature-card">
                    <h3>Multilingual and Accessible</h3>
                    <p>
                        Developed with accessibility in mind, supporting multiple languages to ensure
                        usability for diverse audiences.
                    </p>
                </div>

                <div className="feature-card">
                    <h3>Scalable and Flexible Architecture</h3>
                    <p>
                        Built on modern technologies (React, FastAPI, MongoDB), allowing the system to grow
                        and integrate new data sources or machine learning models as needed.
                    </p>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="testimonials-section" aria-labelledby="why-it-matters-title">
                <h2 id="why-it-matters-title">Why This Project Matters</h2>

                <div className="testimonial">
                    <p>
                        “The main objective is to simplify renewable energy adoption by providing accurate, weather-informed forecasts.”
                    </p>
                </div>
                <div className="testimonial">
                    <p>
                        “These insights assist potential users in evaluating the feasibility of solar power while helping existing users optimize their energy consumption.”
                    </p>
                </div>
            </section>
        </div>
    );
};

export default Home;
