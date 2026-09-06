import { API_URL } from "../services/axiosConfig";

export const getFacebookLoginUrl = ({
  remember = false,
  emailMarketingConsent,
} = {}) => {
  const url = new URL(`${API_URL}/api/auth/facebook`);
  url.searchParams.set("remember", remember ? "1" : "0");
  if (typeof emailMarketingConsent === "boolean") {
    url.searchParams.set("marketing", emailMarketingConsent ? "1" : "0");
  }
  return url.toString();
};
