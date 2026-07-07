# Etapa 1: Compilar la Librería
FROM maven:3.8.8-eclipse-temurin-17 AS lib-builder
WORKDIR /lib-build
COPY firmadigital-libreria-master/pom.xml .
RUN mvn dependency:go-offline -B || true
COPY firmadigital-libreria-master/src ./src
RUN mvn clean install -DskipTests

# Etapa 2: Compilar el Servicio
FROM maven:3.8.8-eclipse-temurin-17 AS builder
WORKDIR /app
COPY --from=lib-builder /root/.m2 /root/.m2
COPY firmadigital-servicio-master/pom.xml .
RUN mvn dependency:go-offline -B || true
COPY firmadigital-servicio-master/src ./src
RUN mvn clean package -DskipTests

# Etapa 3: Runtime (WildFly 35)
FROM quay.io/wildfly/wildfly:35.0.0.Final-jdk17

USER root
# Preparamos el driver y el script de configuración
ADD https://repo1.maven.org/maven2/org/postgresql/postgresql/42.7.2/postgresql-42.7.2.jar /tmp/postgresql-driver.jar
COPY firmadigital-servicio-master/setup-ds.cli /tmp/setup-ds.cli

# Ejecutamos la configuración en modo offline
RUN /opt/jboss/wildfly/bin/jboss-cli.sh --file=/tmp/setup-ds.cli && \
    rm /tmp/postgresql-driver.jar /tmp/setup-ds.cli

# Copiar el WAR compilado
COPY --from=builder /app/target/servicio.war /opt/jboss/wildfly/standalone/deployments/

EXPOSE 8080
CMD ["/opt/jboss/wildfly/bin/standalone.sh", "-b", "0.0.0.0"]
