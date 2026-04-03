from rest_framework.renderers import JSONRenderer


class CustomJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        status_code = 200
        message = "Success"
        success = True
        errors = None
        meta = None

        if renderer_context:
            response = renderer_context.get("response")
            if response:
                status_code = response.status_code

            # Handle Errors
            if status_code >= 400:
                success = False
                message = "Error"

                if isinstance(data, dict):
                    # DRF exceptions usually return {"detail": "..."} or field errors
                    if "detail" in data:
                        message = data["detail"]
                        # If there are other fields, they might be errors?
                        # Standard DRF exception: {'detail': '...'}
                        # Validation Error: {'field': ['error']} -> treated as errors
                        if len(data) > 1:
                            errors = {k: v for k, v in data.items() if k != "detail"}
                    elif "message" in data and "errors" in data:
                        # Already formatted error
                        message = data["message"]
                        errors = data["errors"]
                    else:
                        errors = data
                elif isinstance(data, list):
                    errors = {"non_field_errors": data}
                else:
                    errors = {"non_field_errors": [str(data)]}

                data = None

            # Handle Success
            else:
                # Check for pagination (from CustomPagination)
                if isinstance(data, dict) and "results" in data and "meta" in data:
                    meta = data["meta"]
                    data = data["results"]
                    message = "Data fetched successfully"

                # Check if view returned explicit structure {data: ..., message: ...}
                elif isinstance(data, dict):
                    if "message" in data:
                        message = data.pop("message")

                    if "data" in data and len(data) == 1:
                        # e.g. {"data": ...} -> unwrap
                        data = data["data"]
                    elif "access_token" in data:
                        # specific case for login if we don't change view
                        # keep it as data
                        pass

                    # If the view returns None or empty dict for 200, ensure data is None/Dict
                    # Standard ViewSet list returns list, create returns dict.

        response_data = {
            "success": success,
            "status_code": status_code,
            "message": message,
            "data": data,
            "meta": meta,
            "errors": errors,
        }

        return super().render(response_data, accepted_media_type, renderer_context)
