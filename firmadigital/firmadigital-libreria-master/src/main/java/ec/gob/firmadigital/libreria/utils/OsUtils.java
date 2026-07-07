/*
 * Copyright (C) 2020 
 * Authors: Ricardo Arguello, Misael Fernández
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
 * Utilidades SO y Java.
 *
 * @author Ricardo Arguello
 */
public class OsUtils {

    public static boolean isWindows() {
        String osName = System.getProperty("os.name");
        return (osName.toUpperCase().indexOf("WINDOWS") == 0);
    }

    public static boolean isMac() {
        String osName = System.getProperty("os.name");
        return osName.toUpperCase().contains("MAC");
    }

    public static String getOs() {
        String osName = System.getProperty("os.name");
        return osName.toUpperCase();
    }

    public static String getNameOs(String osName) {
        if (osName.toUpperCase().indexOf("WINDOWS") == 0) {
            osName = "WINDOWS";
        } else if (osName.toUpperCase().contains("MAC")) {
            osName = "MAC";
        } else if (osName.toUpperCase().contains("LINUX")) {
            osName = "LINUX";
        } else if (osName.toUpperCase().contains("ANDROID ")) {
            osName = "ANDROID";
        } else if (osName.toUpperCase().contains("IOS ")) {
            osName = "IOS";
        }
        return osName;
    }

    public static String getJavaVersion() {
        String javaVersion = System.getProperty("java.version");
        return javaVersion.toUpperCase();
    }

    public static boolean is64Bits() {
        return System.getProperty("os.arch").equals("xmd64");
    }
}
