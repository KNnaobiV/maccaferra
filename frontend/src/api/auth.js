import { apiFetch } from "./client";
import { formatApiError } from "../utils/errorMessage";

export async function loginUser(login, password) {
    const res = await apiFetch("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ login, password }),
    });
    let data;
    try {
        data = await res.json();
    } catch (e) {
        throw new Error(`Server returned an unexpected error (${res.status}).`);
    }

    if (!res.ok) {
        throw new Error(formatApiError(data, "Invalid credentials."));
    }
    return data; // { user, access, refresh, message }
}

export async function registerUser(fields) {
    const res = await apiFetch("/auth/register/", {
        method: "POST",
        body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(formatApiError(data, "We could not create your account right now."));
    }
    return data;
}

export async function confirmEmail(key) {
    const res = await apiFetch("/auth/confirm-email/", {
        method: "POST",
        body: JSON.stringify({ key }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(formatApiError(data, "Invalid or expired confirmation link."));
    }
    return data;
}

export async function resendConfirmation(email, password) {
    const res = await apiFetch("/auth/resend-confirmation/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(formatApiError(data, "Failed to resend confirmation."));
    }
    return data;
}

export async function socialLogin(provider, payload) {
    const res = await apiFetch(`/auth/social/${provider}/`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(formatApiError(data, "Social login failed."));
    }
    return data;
}

export async function fetchMe(token) {
    const res = await apiFetch("/auth/user/", { token });
    if (!res.ok) throw new Error("Session expired");
    return res.json();
}

export async function requestPasswordReset(email) {
    const res = await apiFetch("/auth/password-reset/", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(formatApiError(data, "Something went wrong."));
    return data;
}

export async function updateProfile(token, profileData) {
    const isFormData = typeof FormData !== "undefined" && profileData instanceof FormData;
    const res = await apiFetch("/auth/user/", {
        method: "PATCH",
        token,
        body: isFormData ? profileData : JSON.stringify(profileData),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(formatApiError(data, "Failed to update profile."));
    }
    return data;
}

export async function changePassword(token, passwords) {
    const res = await apiFetch("/auth/change-password/", {
        method: "POST",
        token,
        body: JSON.stringify(passwords),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(formatApiError(data, "Failed to change password."));
    }
    return data;
}

export async function confirmPasswordReset(uidb64, token, new_password) {
    const res = await apiFetch("/auth/password-reset/confirm/", {
        method: "POST",
        body: JSON.stringify({ uidb64, token, new_password }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(formatApiError(data, "Failed to reset password."));
    }
    return data;
}