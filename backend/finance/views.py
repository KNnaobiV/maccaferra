"""
finance/views.py
----------------
ViewSets for Expense and Budget models.

Endpoints added to core/urls.py:
  GET/POST   /jobitems/{jobitem_pk}/expenses/
  GET/PATCH/PUT/DELETE  /jobitems/{jobitem_pk}/expenses/{pk}/
  GET/PATCH  /jobitems/{jobitem_pk}/budget/
  GET/PATCH  /workitems/{workitem_pk}/budget/   (flat)
  GET/PATCH  /plots/{plot_pk}/budget/           (flat)
"""
from decimal import Decimal

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import JobItem, WorkItem, ConstructionPlot
from core.permissions import CanManageFinance, CanManageJobFinance, CanManageExpenses

from .models import (
    Expense,
    JobItemBudget,
    WorkItemBudget,
    PlotBudget,
)
from .serializers import (
    ExpenseSerializer,
    JobItemBudgetSerializer,
    WorkItemBudgetSerializer,
    PlotBudgetSerializer,
)


# ---------------------------------------------------------------------------
# Expense ViewSet  (nested under jobitems)
# ---------------------------------------------------------------------------

class JobItemExpenseViewSet(viewsets.ModelViewSet):
    """
    CRUD for expenses attached to a specific job item.

    Nested under: /jobitems/{jobitem_pk}/expenses/
    Also available flat: /expenses/{pk}/ for retrieve/update/delete
    """
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, CanManageExpenses]

    def get_job_item(self):
        jobitem_pk = self.kwargs.get("jobitem_pk")
        if jobitem_pk:
            return get_object_or_404(JobItem, pk=jobitem_pk)
        return None

    def get_plot(self):
        job_item = self.get_job_item()
        if job_item and getattr(job_item, "work_item", None):
            return job_item.work_item.construction_plot
        return None

    def get_queryset(self):
        job_item = self.get_job_item()
        if job_item:
            return Expense.objects.filter(job_item=job_item, is_deleted=False).select_related("cost_code")
        # Flat access: all expenses the user owns (via job item hierarchy)
        user = self.request.user
        if getattr(user, "is_superuser", False):
            return Expense.objects.filter(is_deleted=False).select_related("cost_code")
        from django.db.models import Q
        return Expense.objects.filter(
            Q(job_item__work_item__construction_plot__construction_project__created_by=user) |
            Q(job_item__work_item__construction_plot__construction_project__client=user) |
            Q(job_item__work_item__construction_plot__construction_project__project_manager=user) |
            Q(job_item__work_item__construction_plot__foreman=user),
            is_deleted=False
        ).distinct().select_related("cost_code")

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        job_item = self.get_job_item()
        if not job_item:
            raise ValidationError({"job_item": "Job item is required."})
        if job_item.job_status == 'Completed':
            raise ValidationError({"non_field_errors": ["Cannot add expenses to a completed job item."]})
        serializer.save(job_item=job_item)

    def perform_update(self, serializer):
        from rest_framework.exceptions import ValidationError
        expense = self.get_object()
        if expense.job_item and expense.job_item.job_status == 'Completed':
            raise ValidationError({"non_field_errors": ["Cannot update expenses of a completed job item."]})
        serializer.save()

    def perform_destroy(self, instance):
        from rest_framework.exceptions import PermissionDenied, ValidationError
        from django.utils import timezone
        from core.roles import get_plot_role, get_project_role

        if instance.job_item and instance.job_item.job_status == 'Completed':
            raise ValidationError({"non_field_errors": ["Cannot delete expenses of a completed job item."]})

        # Permission check: Only PM or plot/project creator can delete an expense
        user = self.request.user
        plot = self.get_plot()
        if not plot and instance.job_item and instance.job_item.work_item:
            plot = instance.job_item.work_item.construction_plot
        elif not plot and instance.work_item and instance.work_item.construction_plot:
            plot = instance.work_item.construction_plot
        elif not plot and instance.plot:
            plot = instance.plot

        role = get_plot_role(user, plot) if plot else "none"
        if not plot and instance.project:
            role = get_project_role(user, instance.project)

        is_super = getattr(user, "is_superuser", False)
        if role not in {"owner", "project_manager"} and not is_super:
            raise PermissionDenied("Only the project manager or plot creator can delete an expense.")

        # Deletion reason is strictly required
        reason = None
        if hasattr(self.request, "data") and isinstance(self.request.data, dict):
            reason = self.request.data.get("reason")
        if not reason:
            reason = self.request.query_params.get("reason")

        if not reason or not str(reason).strip():
            raise ValidationError({"reason": "A reason for deleting this expense is required."})

        # Soft delete and persist audit trail
        instance.is_deleted = True
        instance.deletion_reason = str(reason).strip()
        instance.deleted_by = user
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_deleted", "deletion_reason", "deleted_by", "deleted_at", "updated_at"])


# ---------------------------------------------------------------------------
# Budget ViewSets (one per level)
# ---------------------------------------------------------------------------

class JobItemBudgetViewSet(viewsets.ViewSet):
    """
    GET  /jobitems/{jobitem_pk}/budget/    → retrieve or create budget
    PATCH /jobitems/{jobitem_pk}/budget/   → update allocated_amount / currency
    """
    permission_classes = [IsAuthenticated, CanManageJobFinance]

    def _get_job_item(self, jobitem_pk):
        return get_object_or_404(JobItem, pk=jobitem_pk)

    def get_plot(self):
        jobitem_pk = self.kwargs.get("jobitem_pk")
        if jobitem_pk:
            job_item = self._get_job_item(jobitem_pk)
            if job_item and getattr(job_item, "work_item", None):
                return job_item.work_item.construction_plot
        return None

    def list(self, request, jobitem_pk=None):
        job_item = self._get_job_item(jobitem_pk)
        budget, _ = JobItemBudget.objects.get_or_create(
            job_item=job_item,
            defaults={"allocated_amount": Decimal("0.00"), "currency": "NGN"},
        )
        return Response(JobItemBudgetSerializer(budget).data)

    def partial_update(self, request, pk=None, jobitem_pk=None):
        from rest_framework.exceptions import ValidationError
        job_item = self._get_job_item(jobitem_pk)
        if job_item.job_status == 'Completed':
            raise ValidationError({"non_field_errors": ["Cannot update budget of a completed job item."]})
        budget, _ = JobItemBudget.objects.get_or_create(
            job_item=job_item,
            defaults={"allocated_amount": Decimal("0.00"), "currency": "NGN"},
        )
        serializer = JobItemBudgetSerializer(budget, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class WorkItemBudgetViewSet(viewsets.ViewSet):
    """
    GET  /workitems/{workitem_pk}/budget/
    PATCH /workitems/{workitem_pk}/budget/
    """
    permission_classes = [IsAuthenticated, CanManageFinance]

    def _get_work_item(self, workitem_pk):
        return get_object_or_404(WorkItem, pk=workitem_pk)

    def list(self, request, workitem_pk=None):
        work_item = self._get_work_item(workitem_pk)
        budget, _ = WorkItemBudget.objects.get_or_create(
            work_item=work_item,
            defaults={"allocated_amount": Decimal("0.00"), "currency": "NGN"},
        )
        return Response(WorkItemBudgetSerializer(budget).data)

    def partial_update(self, request, pk=None, workitem_pk=None):
        from django.core.exceptions import ValidationError
        work_item = self._get_work_item(workitem_pk)
        if work_item.work_status == 'Completed':
            raise ValidationError("Cannot update budget of a completed work item.")
        budget, _ = WorkItemBudget.objects.get_or_create(
            work_item=work_item,
            defaults={"allocated_amount": Decimal("0.00"), "currency": "NGN"},
        )
        serializer = WorkItemBudgetSerializer(budget, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PlotBudgetViewSet(viewsets.ViewSet):
    """
    GET  /plots/{plot_pk}/budget/
    PATCH /plots/{plot_pk}/budget/
    """
    permission_classes = [IsAuthenticated, CanManageFinance]

    def _get_plot(self, plot_pk):
        return get_object_or_404(ConstructionPlot, pk=plot_pk)

    def list(self, request, plot_pk=None):
        plot = self._get_plot(plot_pk)
        budget, _ = PlotBudget.objects.get_or_create(
            plot=plot,
            defaults={"allocated_amount": Decimal("0.00"), "currency": "NGN"},
        )
        return Response(PlotBudgetSerializer(budget).data)

    def partial_update(self, request, pk=None, plot_pk=None):
        from django.core.exceptions import ValidationError
        plot = self._get_plot(plot_pk)
        if plot.status == 'Completed':
            raise ValidationError("Cannot update budget of a completed plot.")
        budget, _ = PlotBudget.objects.get_or_create(
            plot=plot,
            defaults={"allocated_amount": Decimal("0.00"), "currency": "NGN"},
        )
        serializer = PlotBudgetSerializer(budget, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
