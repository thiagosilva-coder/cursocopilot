import copy
import pytest
from fastapi.testclient import TestClient

from src import app as _app_module


@pytest.fixture
def client():
    return TestClient(_app_module.app)


@pytest.fixture(autouse=True)
def reset_activities():
    """Save and restore the in-memory activities dict around each test."""
    orig = copy.deepcopy(_app_module.activities)
    yield
    _app_module.activities.clear()
    _app_module.activities.update(orig)
