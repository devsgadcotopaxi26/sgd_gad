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
package ec.gob.firmadigital.libreria.certificate.ec;

/**
 * Certificado que identifica al suscriptor como funcionario o servidor publico,
 * quien actuara a titulo de la Institucion publica que representa y sera
 * responsable de todo lo que firme electronicamente dentro del ambito de su
 * actividad y limites de uso que correspondan.
 *
 * @author Ricardo Arguello
 */
public interface CertificadoFuncionarioPublico extends CertificadoPersonaNatural {

    /**
     * @return Institucion
     */
    String getInstitucion();

    /**
     * @return Cargo
     */
    String getCargo();

    /**
     * @return Razon Social
     */
    String getRazonSocial();
}
