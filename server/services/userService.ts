/**
 * USER SERVICE - LÓGICA DE NEGOCIO DE USUARIOS
 * =============================================
 * 
 * Maneja toda la lógica de negocio relacionada con usuarios y empleados.
 * NO accede directamente a la base de datos - recibe datos de storage.
 */

import bcrypt from "bcryptjs";
import type { Employee, CreateEmployee, InsertEmployee } from "@shared/schema";

/**
 * Interfaz para datos del empleado sin campos sensibles
 */
export interface SafeEmployee extends Omit<Employee, 'passwordHash'> {}

export class UserService {
  /**
   * VALIDAR DATOS DE EMPLEADO ANTES DE CREAR
   * ========================================
   * 
   * Valida que los datos del empleado sean correctos antes de la creación.
   * 
   * @param employeeData - Datos del empleado a validar
   * @throws Error si los datos son inválidos
   */
  validateEmployeeData(employeeData: Partial<CreateEmployee>): void {
    if (employeeData.email) {
      if (!this.isValidEmail(employeeData.email)) {
        throw new Error("Formato de email inválido");
      }
    }

    if (employeeData.numEmployee) {
      if (employeeData.numEmployee.trim().length === 0) {
        throw new Error("El número de empleado no puede estar vacío");
      }
    }

    if (employeeData.firstName) {
      if (employeeData.firstName.trim().length < 2) {
        throw new Error("El nombre debe tener al menos 2 caracteres");
      }
    }

    if (employeeData.lastName) {
      if (employeeData.lastName.trim().length < 2) {
        throw new Error("El apellido debe tener al menos 2 caracteres");
      }
    }

    if (employeeData.password) {
      const passwordValidation = this.validatePassword(employeeData.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.message);
      }
    }
  }

  /**
   * VERIFICAR UNICIDAD DE EMAIL
   * ===========================
   * 
   * Verifica que el email no esté ya registrado en el sistema.
   * 
   * @param email - Email a verificar
   * @param existingEmployees - Lista de empleados existentes
   * @param excludeId - ID a excluir de la verificación (para actualizaciones)
   * @returns true si el email es único, false si ya existe
   */
  isEmailUnique(
    email: string, 
    existingEmployees: Employee[], 
    excludeId?: string
  ): boolean {
    return !existingEmployees.some(
      emp => emp.email === email && emp.id !== excludeId
    );
  }

  /**
   * VERIFICAR UNICIDAD DE NÚMERO DE EMPLEADO
   * =========================================
   * 
   * Verifica que el número de empleado no esté ya registrado.
   * 
   * @param employeeNumber - Número de empleado a verificar
   * @param existingEmployees - Lista de empleados existentes
   * @param excludeId - ID a excluir de la verificación (para actualizaciones)
   * @returns true si el número es único, false si ya existe
   */
  isEmployeeNumberUnique(
    employeeNumber: string, 
    existingEmployees: Employee[], 
    excludeId?: string
  ): boolean {
    return !existingEmployees.some(
      emp => emp.numEmployee === employeeNumber && emp.id !== excludeId
    );
  }

  /**
   * VALIDAR FORMATO DE EMAIL
   * ========================
   * 
   * Valida que el email tenga un formato correcto.
   * 
   * @param email - Email a validar
   * @returns true si el formato es válido
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * VALIDAR CONTRASEÑA
   * ==================
   * 
   * Valida que la contraseña cumpla con los requisitos de seguridad.
   * 
   * @param password - Contraseña a validar
   * @returns Objeto con resultado de validación y mensaje
   */
  validatePassword(password: string): { isValid: boolean; message: string } {
    if (password.length < 6) {
      return {
        isValid: false,
        message: "La contraseña debe tener al menos 6 caracteres"
      };
    }

    return {
      isValid: true,
      message: "Contraseña válida"
    };
  }

  /**
   * HASHEAR CONTRASEÑA
   * ==================
   * 
   * Genera un hash seguro de la contraseña usando bcrypt.
   * 
   * @param password - Contraseña en texto plano
   * @returns Hash de la contraseña
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  /**
   * VERIFICAR CONTRASEÑA
   * ====================
   * 
   * Compara una contraseña en texto plano con su hash.
   * 
   * @param password - Contraseña en texto plano
   * @param hash - Hash almacenado
   * @returns true si la contraseña coincide
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * REMOVER CAMPOS SENSIBLES
   * ========================
   * 
   * Elimina campos sensibles (password) de un empleado.
   * 
   * @param employee - Empleado con todos los campos
   * @returns Empleado sin campos sensibles
   */
  removeSensitiveFields(employee: Employee): SafeEmployee {
    const { passwordHash, ...safeEmployee } = employee;
    return safeEmployee;
  }

  /**
   * REMOVER CAMPOS SENSIBLES DE MÚLTIPLES EMPLEADOS
   * ================================================
   * 
   * Elimina campos sensibles de un array de empleados.
   * 
   * @param employees - Array de empleados
   * @returns Array de empleados sin campos sensibles
   */
  removeSensitiveFieldsFromArray(employees: Employee[]): SafeEmployee[] {
    return employees.map(emp => this.removeSensitiveFields(emp));
  }

  /**
   * VALIDAR ACTUALIZACIÓN DE EMPLEADO
   * ==================================
   * 
   * Valida los datos para actualización de un empleado.
   * 
   * @param updateData - Datos a actualizar
   * @param existingEmployees - Lista de empleados existentes
   * @param employeeId - ID del empleado a actualizar
   * @throws Error si los datos son inválidos
   */
  validateEmployeeUpdate(
    updateData: Partial<InsertEmployee>,
    existingEmployees: Employee[],
    employeeId: string
  ): void {
    if (updateData.email) {
      if (!this.isValidEmail(updateData.email)) {
        throw new Error("Formato de email inválido");
      }
      if (!this.isEmailUnique(updateData.email, existingEmployees, employeeId)) {
        throw new Error("El email ya está registrado");
      }
    }

    if (updateData.numEmployee) {
      if (!this.isEmployeeNumberUnique(
        updateData.numEmployee, 
        existingEmployees, 
        employeeId
      )) {
        throw new Error("El número de empleado ya está registrado");
      }
    }

    if (updateData.firstName && updateData.firstName.trim().length < 2) {
      throw new Error("El nombre debe tener al menos 2 caracteres");
    }

    if (updateData.lastName && updateData.lastName.trim().length < 2) {
      throw new Error("El apellido debe tener al menos 2 caracteres");
    }
  }

  /**
   * CALCULAR ANTIGÜEDAD EN DÍAS
   * ============================
   * 
   * Calcula los días de antigüedad de un empleado.
   * 
   * @param hireDate - Fecha de contratación
   * @returns Número de días de antigüedad
   */
  calculateSeniority(hireDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(hireDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * FORMATEAR NOMBRE COMPLETO
   * =========================
   * 
   * Formatea el nombre completo del empleado.
   * 
   * @param firstName - Nombre
   * @param lastName - Apellido
   * @returns Nombre completo formateado
   */
  formatFullName(firstName: string, lastName: string): string {
    return `${firstName.trim()} ${lastName.trim()}`;
  }
}

export const userService = new UserService();
