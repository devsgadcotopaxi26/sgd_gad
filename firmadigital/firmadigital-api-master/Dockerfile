# Etapa 1: Compilación (Build)
FROM maven:3.8.8-eclipse-temurin-17 AS builder
WORKDIR /app

# Copiamos primero el pom.xml para aprovechar el caché de capas de Docker en dependencias
COPY pom.xml .
# Descargamos dependencias en offline (opcional, acelera re-builds)
RUN mvn dependency:go-offline -B || true

# Copiamos el código fuente y compilamos
COPY src ./src
RUN mvn clean package -DskipTests

# Etapa 2: Servidor de Aplicaciones (Runtime)
# Usando la imagen oficial de WildFly 35 recomendada por el README
FROM quay.io/wildfly/wildfly:35.0.0.Final-jdk17

# Copiamos el WAR compilado a la carpeta de despliegues de WildFly
COPY --from=builder /app/target/api.war /opt/jboss/wildfly/standalone/deployments/

# Exponemos el puerto de WildFly
EXPOSE 8080

# Script de inicio nativo de Wildfly enviando las propiedades del sistema en el comando
# En base a las configuraciones globales necesarias para desarrollo
CMD ["/opt/jboss/wildfly/bin/standalone.sh", "-b", "0.0.0.0", "-Dfirmadigital-servicio.url=https://impws.firmadigital.gob.ec/servicio", "-Dfirmadigital-servicio-mobile.url=https://impws.firmadigital.gob.ec/servicio"]
