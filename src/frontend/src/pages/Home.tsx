import React from 'react';


const Home: React.FC = () => {
    return (
        <div className="home-container">
            <section className="hero-section">
                <h2>Solar Energy Forecasting Platform</h2>
                <p>
                    This project is part of a bachelor’s thesis aimed at developing an advanced platform for forecasting
                    solar energy production. The system combines cutting-edge machine learning models with modern web
                    technologies to provide a reliable and user-friendly tool for optimizing solar energy use.
                </p>
                <p>
                    The primary goal of this platform is to support solar energy operators, researchers, and enthusiasts
                    by offering precise energy generation predictions based on weather data, satellite imagery, and
                    historical solar output. This data can help improve grid stability, enhance energy efficiency, and
                    aid in planning renewable energy strategies.
                </p>

            </section>

            <section id="features" className="features-section">
                <h2>Key Highlights</h2>
                <div className="feature-card">
                    <h3>Academic Excellence</h3>
                    <p>
                        This project is a culmination of extensive research and practical implementation, demonstrating
                        the integration of machine learning and software engineering principles in real-world
                        applications.
                    </p>
                </div>
                <div className="feature-card">
                    <h3>Purpose-Built for Solar Forecasting</h3>
                    <p>
                        The platform uses advanced neural network models trained on large datasets to predict solar
                        energy output with high accuracy, making it an indispensable tool for renewable energy
                        optimization.
                    </p>
                </div>
                <div className="feature-card">
                    <h3>Comprehensive Data Integration</h3>
                    <p>
                        Combines real-time weather forecasts, historical solar production data, and geospatial metadata
                        to ensure reliable and detailed predictions.
                    </p>
                </div>
                <div className="feature-card">
                    <h3>Multilingual and Accessible</h3>
                    <p>
                        Designed with accessibility in mind, the platform supports multiple languages, including
                        English, Lithuanian, and Ukrainian, ensuring usability for a diverse audience.
                    </p>
                </div>
                <div className="feature-card">
                    <h3>Scalable and Flexible Architecture</h3>
                    <p>
                        Built with modern technologies such as React, FastAPI, and MongoDB, the system is scalable and
                        ready for future enhancements, including integration with additional datasets or advanced
                        machine learning models.
                    </p>
                </div>
            </section>

            <section className="testimonials-section">
                <h2>Why This Project Matters</h2>
                <div className="testimonial">
                    <p>
                        "This platform represents a significant step towards harnessing the potential of renewable
                        energy by providing reliable solar energy forecasts that empower users to make data-driven
                        decisions."
                    </p>
                </div>
                <div className="testimonial">
                    <p>
                        "Through the integration of cutting-edge technology and thoughtful design, this project
                        demonstrates how machine learning can transform the energy sector."
                    </p>
                </div>
            </section>
        </div>

    );
};

export default Home;
