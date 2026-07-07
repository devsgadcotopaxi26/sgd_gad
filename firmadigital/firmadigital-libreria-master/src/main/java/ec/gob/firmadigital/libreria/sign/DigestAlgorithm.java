/*
 * Copyright (C) 2021 
 * Authors: Ricardo Arguello
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
package ec.gob.firmadigital.libreria.sign;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;

/**
 * Supported Algorithms
 *
 */
public enum DigestAlgorithm {

    /**
     * SHA-256
     */
    SHA256("SHA256", "SHA-256"),
    /**
     * SHA-512
     */
    SHA512("SHA512", "SHA-512");

    /**
     * Name of the algorithm
     */
    private final String name;

    /**
     * Java name of the algorithm
     */
    private final String javaName;

    DigestAlgorithm(final String name, final String javaName) {
        this.name = name;
        this.javaName = javaName;
    }

    /**
     * Get the algorithm name
     *
     * @return the algorithm name
     */
    public String getName() {
        return name;
    }

    /**
     * Get the JCE algorithm name
     *
     * @return the java algorithm name
     */
    public String getJavaName() {
        return javaName;
    }

    private static class Registry {

        /**
         * A map between algorithm names
         */
        private static final Map<String, DigestAlgorithm> ALGORITHMS = registerAlgorithms();

        /**
         * A map between JAVA algorithm names
         */
        private static final Map<String, DigestAlgorithm> JAVA_ALGORITHMS = registerJavaAlgorithms();

        private static Map<String, DigestAlgorithm> registerAlgorithms() {
            final Map<String, DigestAlgorithm> map = new HashMap<>();
            for (final DigestAlgorithm digestAlgorithm : values()) {
                map.put(digestAlgorithm.name, digestAlgorithm);
            }
            return map;
        }

        private static Map<String, DigestAlgorithm> registerJavaAlgorithms() {
            final Map<String, DigestAlgorithm> map = new HashMap<>();
            for (final DigestAlgorithm digestAlgorithm : values()) {
                map.put(digestAlgorithm.javaName, digestAlgorithm);
            }
            return map;
        }
    }

    /**
     * Returns the digest algorithm associated to the given name.
     *
     * @param name the algorithm name
     * @return the digest algorithm linked to the given name
     * @throws IllegalArgumentException if the given name doesn't match any
     * algorithm
     */
    public static DigestAlgorithm forName(final String name) {
        final DigestAlgorithm algorithm = Registry.ALGORITHMS.get(name);
        if (algorithm == null) {
            throw new IllegalArgumentException("Unsupported algorithm: " + name);
        }
        return algorithm;
    }

    /**
     * Returns indication if the algorithm with given {@code name} is supported
     *
     * @param name {@link String} target algorithm's name
     * @return TRUE if the algorithm is supported, FALSE otherwise
     */
    public static boolean isSupportedAlgorithm(final String name) {
        return Registry.ALGORITHMS.get(name) != null;
    }

    /**
     * Returns the digest algorithm associated to the given JCE name.
     *
     * @param javaName the JCE algorithm name
     * @return the digest algorithm linked to the given name
     * @throws IllegalArgumentException if the given name doesn't match any
     * algorithm
     */
    public static DigestAlgorithm forJavaName(final String javaName) {
        final DigestAlgorithm algorithm = Registry.JAVA_ALGORITHMS.get(javaName);
        if (algorithm == null) {
            throw new IllegalArgumentException("Unsupported algorithm: " + javaName);
        }
        return algorithm;
    }

    /**
     * Get a new instance of MessageDigest for the current digestAlgorithm
     *
     * @return an instance of MessageDigest
     * @throws NoSuchAlgorithmException if the algorithm is not supported
     */
    public MessageDigest getMessageDigest() throws NoSuchAlgorithmException {
        return MessageDigest.getInstance(javaName);
    }
}
