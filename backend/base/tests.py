from django.test import TestCase
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from base.exceptions import (
    custom_exception_handler,
    humanize_field_name,
    humanize_error_message,
)


class SampleSerializer(serializers.Serializer):
    plot_number = serializers.CharField(required=True, allow_blank=False)
    address = serializers.CharField(required=True, allow_blank=False)
    start_date = serializers.DateField(required=False)
    status = serializers.ChoiceField(choices=["Planned", "In Progress", "Completed"], required=False)
    allocated_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)


class ErrorHandlingTests(TestCase):
    def test_humanize_field_name(self):
        self.assertEqual(humanize_field_name("construction_project"), "Project")
        self.assertEqual(humanize_field_name("plot_number"), "Plot Number")
        self.assertEqual(humanize_field_name("target_end_date"), "Target End Date")
        self.assertEqual(humanize_field_name("job_artisan"), "Artisan")
        self.assertEqual(humanize_field_name("some_custom_field"), "Some Custom Field")

    def test_required_field_error_message(self):
        s = SampleSerializer(data={})
        self.assertFalse(s.is_valid())
        
        # Test custom_exception_handler on serializer errors
        exc = DRFValidationError(s.errors)
        response = custom_exception_handler(exc, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Plot Number is required.", response.data["plot_number"])
        self.assertIn("Address is required.", response.data["address"])
        self.assertIn("Plot Number is required.", response.data["message"])
        self.assertIn("Address is required.", response.data["message"])
        self.assertIn("Plot Number is required.", response.data["detail"])

    def test_blank_field_error_message(self):
        s = SampleSerializer(data={"plot_number": "", "address": ""})
        self.assertFalse(s.is_valid())
        exc = DRFValidationError(s.errors)
        response = custom_exception_handler(exc, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Plot Number cannot be blank.", response.data["plot_number"])
        self.assertIn("Address cannot be blank.", response.data["address"])
        self.assertIn("Plot Number cannot be blank.", response.data["message"])

    def test_invalid_choice_error_message(self):
        s = SampleSerializer(data={"plot_number": "P1", "address": "123 Main St", "status": "UNKNOWN"})
        self.assertFalse(s.is_valid())
        exc = DRFValidationError(s.errors)
        response = custom_exception_handler(exc, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("'UNKNOWN' is not a valid choice for Status.", response.data["status"])

    def test_invalid_date_error_message(self):
        s = SampleSerializer(data={"plot_number": "P1", "address": "123 Main St", "start_date": "not-a-date"})
        self.assertFalse(s.is_valid())
        exc = DRFValidationError(s.errors)
        response = custom_exception_handler(exc, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Start Date must be a valid date in YYYY-MM-DD format.", response.data["start_date"])

    def test_invalid_number_error_message(self):
        s = SampleSerializer(data={"plot_number": "P1", "address": "123 Main St", "allocated_amount": "abc"})
        self.assertFalse(s.is_valid())
        exc = DRFValidationError(s.errors)
        response = custom_exception_handler(exc, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Allocated Budget must be a valid number.", response.data["allocated_amount"])

    def test_django_validation_error_handled_gracefully(self):
        exc = DjangoValidationError("Cannot add work items to a completed plot.")
        response = custom_exception_handler(exc, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["message"], "Cannot add work items to a completed plot.")
        self.assertEqual(response.data["detail"], "Cannot add work items to a completed plot.")

    def test_value_error_handled_gracefully(self):
        exc = ValueError("Plot target end date cannot be before start date.")
        response = custom_exception_handler(exc, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["message"], "Plot target end date cannot be before start date.")
        self.assertEqual(response.data["detail"], "Plot target end date cannot be before start date.")

    def test_integrity_error_unique_constraint(self):
        exc = IntegrityError("UNIQUE constraint failed: core_constructionplot.plot_number")
        response = custom_exception_handler(exc, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("A plot with this plot number already exists in this project.", response.data["message"])

    def test_integrity_error_not_null_constraint(self):
        exc = IntegrityError("NOT NULL constraint failed: core_constructionplot.address")
        response = custom_exception_handler(exc, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Address cannot be empty.", response.data["message"])


from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from core.models import ConstructionProject, ConstructionPlot

User = get_user_model()


class PlotApiErrorHandlingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="pm_user", password="password123")
        self.project = ConstructionProject.objects.create(
            created_by=self.user,
            project_manager=self.user,
            project_name="Metro Tower",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_plot_missing_address(self):
        url = f"/api/projects/{self.project.pk}/plots/"
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Address is required.", response.data.get("message", ""))
        self.assertIn("Address is required.", response.data.get("detail", ""))

    def test_create_plot_blank_address(self):
        url = f"/api/projects/{self.project.pk}/plots/"
        response = self.client.post(url, {"address": "   "}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Address cannot be blank.", response.data.get("message", ""))

    def test_create_plot_end_date_before_start_date(self):
        url = f"/api/projects/{self.project.pk}/plots/"
        response = self.client.post(url, {
            "address": "Plot 100",
            "start_date": "2026-10-10",
            "target_end_date": "2026-10-01",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Plot target end date cannot be before start date.", response.data.get("message", ""))

    def test_create_plot_success_attaches_project(self):
        url = f"/api/projects/{self.project.pk}/plots/"
        response = self.client.post(url, {
            "address": "123 Construction Blvd",
            "start_date": "2026-10-01",
            "target_end_date": "2026-10-10",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["address"], "123 Construction Blvd")
        self.assertEqual(response.data["construction_project"], self.project.pk)

    def test_create_plot_with_all_fields(self):
        foreman = User.objects.create_user(username="foreman_bob", email="foreman_bob@test.com", password="pw")
        storekeeper = User.objects.create_user(username="store_alice", email="store_alice@test.com", password="pw")
        url = f"/api/projects/{self.project.pk}/plots/"
        response = self.client.post(url, {
            "plot_number": "PLOT-101",
            "plot_name": "Block B",
            "address": "456 Sector 7",
            "status": "In Progress",
            "start_date": "2026-10-01",
            "target_end_date": "2026-11-01",
            "gps_latitude": "6.524379",
            "gps_longitude": "3.379206",
            "notes": "Corner plot with generator",
            "foreman_id": foreman.pk,
            "storekeeper_id": storekeeper.pk,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["plot_number"], "PLOT-101")
        self.assertEqual(response.data["plot_name"], "PLOT-101")
        self.assertEqual(response.data["status"], "In Progress")
        self.assertEqual(response.data["address"], "456 Sector 7")
        self.assertEqual(response.data["notes"], "Corner plot with generator")
        self.assertEqual(response.data["foreman"]["id"], foreman.pk)
        self.assertEqual(response.data["storekeeper"]["id"], storekeeper.pk)
        self.assertEqual(response.data["construction_project"], self.project.pk)

    def test_create_plot_with_plot_name_fallback(self):
        url = f"/api/projects/{self.project.pk}/plots/"
        response = self.client.post(url, {
            "plot_name": "Penthouse Plot",
            "address": "789 Skyline Ave",
            "start_date": "2026-10-01",
            "target_end_date": "2026-10-10",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["plot_number"], "Penthouse Plot")
        self.assertEqual(response.data["plot_name"], "Penthouse Plot")


class WorkItemApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username="project_owner", email="owner@test.com", password="password123")
        self.pm = User.objects.create_user(username="project_pm", email="pm@test.com", password="password123")
        self.project = ConstructionProject.objects.create(
            created_by=self.owner,
            project_manager=self.pm,
            project_name="Skyline Residences",
        )
        self.plot = ConstructionPlot.objects.create(
            construction_project=self.project,
            plot_number="Plot-A",
            address="100 Skyline Blvd",
            status="Planned",
        )

    def test_create_work_item_nested_by_pm(self):
        self.client.force_authenticate(user=self.pm)
        url = f"/api/projects/{self.project.pk}/plots/{self.plot.pk}/workitems/"
        response = self.client.post(url, {
            "name": "Excavation",
            "description": "Dig foundation",
            "work_status": "Planned",
            "start_date": "2026-10-01",
            "target_end_date": "2026-10-15",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Excavation")
        self.assertEqual(response.data["construction_plot"], self.plot.pk)

    def test_create_work_item_nested_by_owner(self):
        self.client.force_authenticate(user=self.owner)
        url = f"/api/projects/{self.project.pk}/plots/{self.plot.pk}/workitems/"
        response = self.client.post(url, {
            "name": "Foundation Slab",
            "description": "Pour concrete slab",
            "work_status": "Planned",
            "start_date": "2026-10-16",
            "target_end_date": "2026-10-30",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Foundation Slab")

    def test_create_work_item_flat_endpoint(self):
        self.client.force_authenticate(user=self.pm)
        url = "/api/workitems/"
        response = self.client.post(url, {
            "name": "Framing",
            "description": "Wood framing",
            "work_status": "Planned",
            "start_date": "2026-11-01",
            "target_end_date": "2026-11-15",
            "construction_plot": self.plot.pk,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Framing")
        self.assertEqual(response.data["construction_plot"], self.plot.pk)

