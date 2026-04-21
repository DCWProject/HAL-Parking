from django.db.models.signals import (
    post_save,
    post_delete
)

from django.dispatch import receiver

from .models import Spot
from .services import load_spot_cache

import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Spot)
def refresh_cache_on_save(sender, instance, created, **kwargs):

    load_spot_cache()

    if created:

        logger.info(
            f"Spot created → cache refreshed ({instance.spot_code})"
        )

    else:

        logger.info(
            f"Spot updated → cache refreshed ({instance.spot_code})"
        )


@receiver(post_delete, sender=Spot)
def refresh_cache_on_delete(sender, instance, **kwargs):

    load_spot_cache()

    logger.info(
        f"Spot deleted → cache refreshed ({instance.spot_code})"
    )