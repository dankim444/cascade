"""
Explicit CORS for any origin. Handles OPTIONS preflight so responses always
include Access-Control-Allow-Origin (Starlette's CORSMiddleware can miss some
cases; Chrome may send Access-Control-Request-Private-Network for local → public).
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class PermissiveCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        req_headers = request.headers.get("access-control-request-headers")
        req_pn = request.headers.get("access-control-request-private-network")

        def apply_to_response(response: Response) -> Response:
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
            else:
                response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Expose-Headers"] = "*"
            return response

        if request.method == "OPTIONS":
            h = {
                "Access-Control-Allow-Methods": "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT",
                "Access-Control-Max-Age": "86400",
            }
            if origin:
                h["Access-Control-Allow-Origin"] = origin
                h["Access-Control-Allow-Credentials"] = "true"
            else:
                h["Access-Control-Allow-Origin"] = "*"
            h["Access-Control-Allow-Headers"] = req_headers or "authorization, content-type, accept, origin, x-requested-with"
            if req_pn == "true":
                h["Access-Control-Allow-Private-Network"] = "true"
            return Response(status_code=204, headers=h)

        response = await call_next(request)
        return apply_to_response(response)
