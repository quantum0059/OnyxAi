import { createProxyMiddleware } from "http-proxy-middleware";

export const proxyWithHeader = (serviceUrl, pathPrefix) => {
    return createProxyMiddleware({
        target: serviceUrl,
        changeOrigin: true,
        pathRewrite: (path) => path.replace(pathPrefix, ""),
        on: {
            proxyReq: (proxyReq, req, res) => {
                if (req.user?.userId) {
                    proxyReq.setHeader("x-user-id", req.user.userId);
                }
            }
        }
    });
};
