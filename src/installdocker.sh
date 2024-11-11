#!/bin/bash

# Update package information
echo "Updating package information..."
sudo apt-get update

# Install required dependencies
echo "Installing required dependencies..."
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker’s official GPG key
echo "Adding Docker’s official GPG key..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker’s stable repository
echo "Adding Docker repository..."
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index again
echo "Updating package information again..."
sudo apt-get update

# Install Docker CE (Community Edition)
echo "Installing Docker CE..."
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Check Docker version
echo "Docker version:"
docker --version

# Add the current user to the Docker group (to run Docker without sudo)
echo "Adding the current user to the Docker group..."
sudo usermod -aG docker $USER

# Enable Docker to start on boot
echo "Enabling Docker to start on boot..."
sudo systemctl enable docker

# Start Docker
echo "Starting Docker..."
sudo systemctl start docker

# Print Docker status
echo "Docker status:"
sudo systemctl status docker --no-pager

# Inform user to log out and back in
echo "Docker has been installed successfully!"
echo "Please log out and log back in to apply group changes."


echo "Running build."

sudo docker compose up --build