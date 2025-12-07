import axios from "axios";

import { env } from "@/shared/config/env.config";

export const axiosInstance = axios.create({
	baseURL: env.baseURL,
	withCredentials: true,
	headers: {
		"Content-Type": "application/json",
	},
});

axiosInstance.interceptors.request.use((config) => {
	const token = localStorage.getItem("auth_token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

axiosInstance.interceptors.response.use(
	(response) => response,
	(error) => {
		const message =
			error?.response?.data?.message || error?.message || "Request failed";
		return Promise.reject(new Error(message));
	}
);
