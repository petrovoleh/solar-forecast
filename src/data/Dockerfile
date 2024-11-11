# Use the official MongoDB image from Docker Hub
FROM mongo:latest

# Set environment variables (optional)
# For example, create a custom database name, user, and password.
# These are optional and can be passed during container startup.
ENV MONGO_INITDB_ROOT_USERNAME=rootuser
ENV MONGO_INITDB_ROOT_PASSWORD=rootpassword
ENV MONGO_INITDB_DATABASE=mydatabase

# Copy initialization scripts if needed (optional)
# If you have scripts to initialize the database (like creating collections, importing data),
# you can copy them into the container.
#COPY ./init-mongo.js /docker-entrypoint-initdb.d/

# Expose the default MongoDB port
EXPOSE 27017

# The default MongoDB entrypoint is already set in the official image
# You don't need to specify a CMD here as it's already part of the base image
