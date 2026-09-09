from decimal import Decimal
from datetime import date

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import Sum
from django.test import TestCase

from core.models import ConstructionPlot, ConstructionProject, JobItem, WorkItem
from .models import (
    CostCode,
    Expense,
    JobItemBudget,
    PlotBudget,
    ProjectBudget,
    WorkItemBudget,
)


User = get_user_model()


class BudgetModelsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='budgetuser', password='testpass')
        self.project = ConstructionProject.objects.create(
            created_by=self.user,
            project_name='Budget Project',
            start_date=date.today(),
            target_end_date=date.today(),
        )
        self.plot = ConstructionPlot.objects.create(
            construction_project=self.project,
            address='123 Budget Lane',
            start_date=date.today(),
            target_end_date=date.today(),
        )
        self.work_item = WorkItem.objects.create(
            construction_plot=self.plot,
            name='Foundation',
            start_date=date.today(),
            target_end_date=date.today(),
        )
        self.job_item = JobItem.objects.create(
            work_item=self.work_item,
            job_artisan=JobItem.Artisans.MASON,
            start_date=date.today(),
            target_end_date=date.today(),
        )
        self.cost_code = CostCode.objects.create(
            code='MAT',
            description='Materials',
        )

    def test_budget_spent_is_derived_from_expenses(self):
        budget = ProjectBudget.objects.create(
            project=self.project,
            allocated_amount=Decimal('10000.00'),
        )
        Expense.objects.create(
            cost_code=self.cost_code,
            amount=Decimal('2500.00'),
            project=self.project,
        )
        self.assertEqual(budget.spent_amount, Decimal('2500.00'))
        self.assertEqual(budget.remaining_amount, Decimal('7500.00'))

    def test_plot_budget_can_aggregate_plot_expenses(self):
        budget = PlotBudget.objects.create(
            plot=self.plot,
            allocated_amount=Decimal('5000.00'),
        )
        Expense.objects.create(
            cost_code=self.cost_code,
            amount=Decimal('1200.00'),
            plot=self.plot,
        )
        self.assertEqual(budget.spent_amount, Decimal('1200.00'))
        self.assertEqual(budget.remaining_amount, Decimal('3800.00'))

    def test_work_item_budget_can_aggregate_work_item_expenses(self):
        budget = WorkItemBudget.objects.create(
            work_item=self.work_item,
            allocated_amount=Decimal('2500.00'),
        )
        Expense.objects.create(
            cost_code=self.cost_code,
            amount=Decimal('600.00'),
            work_item=self.work_item,
        )
        self.assertEqual(budget.spent_amount, Decimal('600.00'))
        self.assertEqual(budget.remaining_amount, Decimal('1900.00'))

    def test_job_item_budget_can_aggregate_job_item_expenses(self):
        budget = JobItemBudget.objects.create(
            job_item=self.job_item,
            allocated_amount=Decimal('1200.00'),
        )
        Expense.objects.create(
            cost_code=self.cost_code,
            amount=Decimal('300.00'),
            job_item=self.job_item,
        )
        self.assertEqual(budget.spent_amount, Decimal('300.00'))
        self.assertEqual(budget.remaining_amount, Decimal('900.00'))

    def test_hierarchical_payment_rollup(self):
        # Create budgets at all levels
        project_budget = ProjectBudget.objects.create(
            project=self.project,
            allocated_amount=Decimal('10000.00'),
        )
        plot_budget = PlotBudget.objects.create(
            plot=self.plot,
            allocated_amount=Decimal('5000.00'),
        )
        work_item_budget = WorkItemBudget.objects.create(
            work_item=self.work_item,
            allocated_amount=Decimal('2500.00'),
        )
        job_item_budget = JobItemBudget.objects.create(
            job_item=self.job_item,
            allocated_amount=Decimal('1000.00'),
        )

        # 1. Add an expense of 300 to the child job item
        Expense.objects.create(
            cost_code=self.cost_code,
            amount=Decimal('300.00'),
            job_item=self.job_item,
        )

        # Verify it propagates to all parent budgets
        self.assertEqual(job_item_budget.spent_amount, Decimal('300.00'))
        self.assertEqual(work_item_budget.spent_amount, Decimal('300.00'))
        self.assertEqual(plot_budget.spent_amount, Decimal('300.00'))
        self.assertEqual(project_budget.spent_amount, Decimal('300.00'))

        # 2. Add a direct expense of 200 to the parent work item
        Expense.objects.create(
            cost_code=self.cost_code,
            amount=Decimal('200.00'),
            work_item=self.work_item,
        )

        # Verify job item is unchanged, but parents reflect both (300 + 200 = 500)
        self.assertEqual(job_item_budget.spent_amount, Decimal('300.00'))
        self.assertEqual(work_item_budget.spent_amount, Decimal('500.00'))
        self.assertEqual(plot_budget.spent_amount, Decimal('500.00'))
        self.assertEqual(project_budget.spent_amount, Decimal('500.00'))


    def test_expense_requires_exactly_one_target(self):
        expense = Expense(
            cost_code=self.cost_code,
            amount=Decimal('100.00'),
        )
        with self.assertRaises(ValidationError):
            expense.full_clean()

    def test_expense_cannot_attach_multiple_targets(self):
        expense = Expense(
            cost_code=self.cost_code,
            amount=Decimal('100.00'),
            project=self.project,
            plot=self.plot,
        )
        with self.assertRaises(ValidationError):
            expense.full_clean()


from rest_framework.test import APITestCase
from rest_framework import status


class JobItemExpenseAPITest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='exp_owner', email='owner@example.com', password='password123')
        self.pm = User.objects.create_user(username='exp_pm', email='pm@example.com', password='password123')
        self.foreman = User.objects.create_user(username='exp_foreman', email='foreman@example.com', password='password123')
        self.strkpr = User.objects.create_user(username='exp_strkpr', email='strkpr@example.com', password='password123')
        self.outsider = User.objects.create_user(username='exp_outsider', email='outsider@example.com', password='password123')

        self.project = ConstructionProject.objects.create(
            created_by=self.owner,
            project_manager=self.pm,
            project_name='API Test Project',
            start_date=date.today(),
            target_end_date=date.today(),
        )
        self.plot = ConstructionPlot.objects.create(
            construction_project=self.project,
            foreman=self.foreman,
            storekeeper=self.strkpr,
            address='123 Plot Road',
            start_date=date.today(),
            target_end_date=date.today(),
        )
        self.work_item = WorkItem.objects.create(
            construction_plot=self.plot,
            name='Foundation Work',
            start_date=date.today(),
            target_end_date=date.today(),
        )
        self.job_item = JobItem.objects.create(
            work_item=self.work_item,
            job_name='Steel fixing',
            job_artisan=JobItem.Artisans.IRON_BENDER,
            start_date=date.today(),
            target_end_date=date.today(),
        )
        self.url = f'/api/jobitems/{self.job_item.pk}/expenses/'

    def test_owner_can_add_expense(self):
        self.client.force_authenticate(user=self.owner)
        payload = {
            'amount': '5000.00',
            'currency': 'NGN',
            'cost_code_code': 'MATERIALS',
            'description': 'Iron bars purchased',
            'incurred_at': '2026-09-09',
        }
        res = self.client.post(self.url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['amount'], '5000.00')
        self.assertEqual(res.data['cost_code_detail']['code'], 'MATERIALS')
        self.assertEqual(Expense.objects.filter(job_item=self.job_item).count(), 1)

    def test_pm_and_foreman_can_add_expense(self):
        self.client.force_authenticate(user=self.pm)
        res_pm = self.client.post(self.url, {'amount': '1200.00'}, format='json')
        self.assertEqual(res_pm.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_pm.data['cost_code_detail']['code'], 'GENERAL')

        self.client.force_authenticate(user=self.foreman)
        res_fm = self.client.post(self.url, {'amount': '800.00'}, format='json')
        self.assertEqual(res_fm.status_code, status.HTTP_201_CREATED)

    def test_outsider_cannot_add_expense(self):
        self.client.force_authenticate(user=self.outsider)
        res = self.client.post(self.url, {'amount': '1000.00'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_storekeeper_cannot_add_expense(self):
        self.client.force_authenticate(user=self.strkpr)
        res = self.client.post(self.url, {'amount': '1000.00'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_add_expense_to_completed_job_item(self):
        self.job_item.job_status = 'Completed'
        self.job_item.save()
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(self.url, {'amount': '1000.00'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_and_delete_expense(self):
        self.client.force_authenticate(user=self.owner)
        exp = Expense.objects.create(
            job_item=self.job_item,
            cost_code=CostCode.objects.create(code='LABOR'),
            amount=Decimal('2000.00'),
        )
        detail_url = f'/api/jobitems/{self.job_item.pk}/expenses/{exp.pk}/'
        # PATCH amount without specifying cost code preserves existing cost code
        res_patch = self.client.patch(detail_url, {'amount': '2500.00'}, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data['cost_code_detail']['code'], 'LABOR')
        self.assertEqual(res_patch.data['amount'], '2500.00')

        # DELETE expense
        res_del = self.client.delete(detail_url)
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Expense.objects.filter(pk=exp.pk).count(), 0)

