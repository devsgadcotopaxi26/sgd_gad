/*
 * Copyright (C) 2024
 * Authors: Misael Fernández
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.*
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package ec.gob.firmadigital.libreria.utils;

/**
 * Application Configuracion using System Properties.
 *
 * Se debe almacenar en el archivo de configuracion del servidor WildFly
 * (standalone.xml), asi:
 *
 * <system-properties>
 * <property name="tsaUrl" value= "xxx" />
 * <property name="tsaUsername" value= "yyy" />
 * <property name="tsaPassword" value= "zzz" />
 * </system-properties>
 *
 * @author Misael Fernández
 */
public class PropertiesTsa {

    private String tsaUrl;
    private String tsaUsername;
    private String tsaPassword;

    private static final String TSA_URL_SYSTEM_PROPERTY = "tsaUrl";
    private static final String TSA_USERNAME_SYSTEM_PROPERTY = "tsaUsername";
    private static final String TSA_PASSWORD_SYSTEM_PROPERTY = "tsaPassword";

    public PropertiesTsa() {
        this.tsaUrl = readSystemProperty(TSA_URL_SYSTEM_PROPERTY);
        this.tsaUsername = readSystemProperty(TSA_USERNAME_SYSTEM_PROPERTY);
        this.tsaPassword = readSystemProperty(TSA_PASSWORD_SYSTEM_PROPERTY);
    }

    public String getTsaUrl() {
        return tsaUrl;
    }

    public String getTsaUsername() {
        return tsaUsername;
    }

    public String getTsaPassword() {
        return tsaPassword;
    }

    private String readSystemProperty(String propertyName) {
        String propertyValue = System.getProperty(propertyName);
        if (propertyValue == null) {
            System.out.println("System property " + propertyName + " not found");
            this.tsaUrl = "https://freetsa.org/tsr";
            this.tsaUsername = null;
            this.tsaPassword = null;
        }
        return propertyValue;
    }
}
