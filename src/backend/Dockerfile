# Stage 1: Build the application
FROM eclipse-temurin:22-jdk AS build
WORKDIR /app

# Copy project files
COPY . .

# Use Gradle Wrapper (if available) to build the project
RUN ./gradlew clean build -x test

# Stage 2: Run the application
FROM eclipse-temurin:22-jre
WORKDIR /app

# Copy the built jar file from the build stage
COPY --from=build /app/build/libs/backend-0.0.1-SNAPSHOT.jar app.jar

# Expose the port your app will run on
EXPOSE 8082

# Set active Spring profile (if needed)
ENV SPRING_PROFILES_ACTIVE=prod

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
