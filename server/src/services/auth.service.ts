import type { ApiResponse } from "shared/src/types/response.type";

import { AuthRepository } from "../repositories/auth.repository";
import auth from "../configs/auth.config";

export class AuthService {
	private authRepository: AuthRepository;

	constructor() {
		this.authRepository = new AuthRepository();
	}

	async register(
		email: string,
		password: string,
		name?: string
	): Promise<ApiResponse> {
		try {
			const existingUser = await this.authRepository.findUserByEmail(email);

			if (existingUser.length > 0) {
				return { message: "User already exists", success: false };
			}

			await auth.api.signUpEmail({
				body: {
					email,
					password,
					name: name ?? email.split("@")[0]!,
				},
			});

			return { message: "User registered successfully", success: true };
		} catch (error: any) {
			return {
				success: false,
				message: error?.message ?? "Registration failed",
			};
		}
	}

	async login(email: string, password: string): Promise<ApiResponse> {
		try {
			await auth.api.signInEmail({
				body: {
					email,
					password,
				},
			});

			return { message: "Login successful", success: true };
		} catch (error: any) {
			return {
				success: false,
				message: error?.message ?? "Login failed",
			};
		}
	}

	async logout(_userId: string): Promise<ApiResponse> {
		try {
			await auth.api.signOut();
			return { message: "Logout successful", success: true };
		} catch (error: any) {
			return {
				success: false,
				message: error?.message ?? "Logout failed",
			};
		}
	}

	async getUserProfile(userId: string) {
		try {
			const user = await this.authRepository.findUserById(userId);
			if (user.length === 0) {
				throw new Error("User not found");
			}
			return user[0];
		} catch {
			throw new Error("Failed to get user profile");
		}
	}

	async updateUserProfile(
		userId: string,
		updates: Partial<{
			name: string;
			image: string;
			email: string;
		}>
	) {
		try {
			const updatedUser = await this.authRepository.updateUser(userId, updates);
			if (updatedUser.length === 0) {
				throw new Error("User not found");
			}
			return updatedUser[0];
		} catch {
			throw new Error("Failed to update user profile");
		}
	}
}
