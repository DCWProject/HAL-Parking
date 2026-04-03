from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
import math


class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "limit"
    max_page_size = 100
    page_query_param = "page"

    def get_paginated_response(self, data):
        # We override this to return the structure we want inside 'data' before the renderer wraps it
        # OR we return a dict that the renderer understands.
        # Let's return a dict with special keys that the renderer can pick up,
        # or simply structure it here and let the renderer wrap it.

        # But wait, the renderer wraps *everything*.
        # If I return a dict here, the renderer will put it inside `data`.
        # I want `results` to be `data`, and the rest to be `meta`.

        # Strategy: Return a structure that the renderer can recognize as paginated
        # OR modify the renderer to check for these keys.

        return Response(
            {
                "results": data,
                "meta": {
                    "page": self.page.number,
                    "limit": self.page.paginator.per_page,
                    "total_records": self.page.paginator.count,
                    "total_pages": self.page.paginator.num_pages,
                },
            }
        )
