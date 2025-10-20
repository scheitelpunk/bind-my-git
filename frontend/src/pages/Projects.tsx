import React, {useState, useEffect} from 'react';
import {Plus, Search, Filter, FolderOpen, Users, Calendar, Clock, Grid3x3, List} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useProjects, useCreateProject} from '@/hooks/useProjects';
import {useAuth} from '@/hooks/useAuth';
import {useOrders} from '@/hooks/useOrders';
import {useTranslation} from 'react-i18next';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Card, {CardContent} from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {formatDate} from '@/utils/dateUtils';
import {ProjectStatus, type ProjectFilters, type CreateProjectData} from '@/types';

type ViewMode = 'grid' | 'details';

const Projects: React.FC = () => {
        const {hasRole} = useAuth();
        const {t} = useTranslation();
        const [page, setPage] = useState(0);
        const [filters, setFilters] = useState<ProjectFilters>({});
        const [showCreateModal, setShowCreateModal] = useState(false);
        const [searchTerm, setSearchTerm] = useState('');
        const [viewMode, setViewMode] = useState<ViewMode>(() => {
            const savedView = localStorage.getItem('projectsViewMode');
            return (savedView as ViewMode) || 'grid';
        });

        const {data: projectsData, isLoading} = useProjects(filters, page, 12);
        const {data: orders = [], isLoading: ordersLoading} = useOrders();
        const createProjectMutation = useCreateProject();

        const [createForm, setCreateForm] = useState<CreateProjectData>({
            name: '',
            description: '',
            start_date: '',
            end_date: '',
            members: [],
            order_id: '',
        });
        const [createError, setCreateError] = useState<string | null>(null);
        const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

        // Save view preference to localStorage
        useEffect(() => {
            localStorage.setItem('projectsViewMode', viewMode);
        }, [viewMode]);

        const statusOptions = [
            {value: '', label: t('projects.allStatuses')},
            {value: ProjectStatus.PLANNING, label: t('projectStatus.planning')},
            {value: ProjectStatus.ACTIVE, label: t('projectStatus.active')},
            {value: ProjectStatus.ON_HOLD, label: t('projectStatus.onHold')},
            {value: ProjectStatus.COMPLETED, label: t('projectStatus.completed')},
            {value: ProjectStatus.CANCELLED, label: t('projectStatus.cancelled')},
        ];

        // Extract unique customers from orders
        const uniqueCustomers = React.useMemo(() => {
            const customerMap = new Map();
            orders.forEach(order => {
                if (order.customer && !customerMap.has(order.customer.id)) {
                    customerMap.set(order.customer.id, order.customer);
                }
            });
            return Array.from(customerMap.values());
        }, [orders]);

        // Filter orders by selected customer
        const filteredOrders = React.useMemo(() => {
            if (!selectedCustomerId) return orders;
            return orders.filter(order => order.customer.id === selectedCustomerId);
        }, [orders, selectedCustomerId]);

        // Filter customers by selected order
        const filteredCustomers = React.useMemo(() => {
            if (!createForm.order_id) return uniqueCustomers;
            const selectedOrder = orders.find(order => order.id === createForm.order_id);
            if (!selectedOrder) return uniqueCustomers;
            return uniqueCustomers.filter(customer => customer.id === selectedOrder.customer.id);
        }, [uniqueCustomers, orders, createForm.order_id]);

        const handleSearch = () => {
            setFilters({...filters, search: searchTerm});
            setPage(0);
        };

        const handleStatusFilter = (status: string) => {
            setFilters({
                ...filters,
                status: status ? [status as ProjectStatus] : undefined,
            });
            setPage(0);
        };

        const handleCustomerChange = (customerId: string) => {
            setSelectedCustomerId(customerId);
            // Clear order selection when customer changes
            setCreateForm({...createForm, order_id: '', customer_id: customerId});
        };

        const handleOrderChange = (orderId: string) => {
            setCreateForm({...createForm, order_id: orderId});
            // Auto-fill customer_id based on selected order
            if (orderId) {
                const selectedOrder = orders.find(order => order.id === orderId);
                if (selectedOrder) {
                    setSelectedCustomerId(selectedOrder.customer.id);
                    setCreateForm({...createForm, order_id: orderId, customer_id: selectedOrder.customer.id});
                }
            } else {
                setCreateForm({...createForm, order_id: ''});
            }
        };

        const handleCreateProject = async (e: React.FormEvent) => {
            e.preventDefault();
            setCreateError(null);

            if (!createForm.name || createForm.name.trim() === '') {
                setCreateError(t('projects.nameRequired'));
                return;
            }

            if (!createForm.start_date || createForm.start_date.trim() === '') {
                setCreateError(t('projects.startDateRequired'));
                return;
            }

            if (!createForm.order_id || createForm.order_id.trim() === '') {
                setCreateError(t('projects.orderRequired'));
                return;
            }

            try {
                const projectData: CreateProjectData = {
                    name: createForm.name,
                    description: createForm.description,
                    start_date: createForm.start_date,
                    members: createForm.members,
                    order_id: createForm.order_id,
                };

                if (createForm.end_date) {
                    projectData.end_date = createForm.end_date;
                }

                if (createForm.customer_id) {
                    projectData.customer_id = createForm.customer_id;
                }

                await createProjectMutation.mutateAsync(projectData);
                setShowCreateModal(false);
                setCreateForm({
                    name: '',
                    description: '',
                    start_date: '',
                    end_date: '',
                    members: [],
                    order_id: '',
                });
                setSelectedCustomerId('');
                setCreateError(null);
            } catch (error) {
                // Error handled by mutation
            }
        };

        const getStatusVariant = (status: ProjectStatus) => {
            switch (status) {
                case ProjectStatus.ACTIVE:
                    return 'success';
                case ProjectStatus.PLANNING:
                    return 'info';
                case ProjectStatus.ON_HOLD:
                    return 'warning';
                case ProjectStatus.COMPLETED:
                    return 'success';
                case ProjectStatus.CANCELLED:
                    return 'danger';
                default:
                    return 'default';
            }
        };

        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner size="lg"/>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('projects.title')}</h1>
                        <p className="text-gray-600">{t('projects.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded transition-colors ${
                                    viewMode === 'grid'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                                title={t('projects.gridView')}
                            >
                                <Grid3x3 className="h-4 w-4"/>
                            </button>
                            <button
                                onClick={() => setViewMode('details')}
                                className={`p-2 rounded transition-colors ${
                                    viewMode === 'details'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                                title={t('projects.detailsView')}
                            >
                                <List className="h-4 w-4"/>
                            </button>
                        </div>
                        {hasRole('project_manager') && (
                            <Button onClick={() => setShowCreateModal(true)} className="flex items-center">
                                <Plus className="h-4 w-4 mr-2"/>
                                {t('projects.createProject')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400"/>
                                    <Input
                                        placeholder={t('projects.searchProjects')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="w-full sm:w-48">
                                <Select
                                    options={statusOptions}
                                    value={filters.status?.[0] || ''}
                                    onChange={(e) => handleStatusFilter(e.target.value)}
                                    placeholder={t('projects.filterByStatus')}
                                />
                            </div>
                            <Button onClick={handleSearch} variant="secondary">
                                <Filter className="h-4 w-4 mr-2"/>
                                {t('common.filter')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Projects Display */}
                {projectsData && projectsData.data && projectsData.data.length === 0 ? (
                    <Card>
                        <CardContent className="text-center py-12">
                            <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('projects.noProjectsFound')}</h3>
                            <p className="text-gray-600 mb-4">
                                {filters.search || filters.status?.length
                                    ? t('projects.tryAdjustingFilters')
                                    : t('projects.getStarted')}
                            </p>
                            {hasRole('project_manager') && (
                                <Button onClick={() => setShowCreateModal(true)}>
                                    <Plus className="h-4 w-4 mr-2"/>
                                    {t('projects.createProject')}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : viewMode === 'grid' ? (
                    // Grid View
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projectsData?.data.map((project) => (
                            <Link key={project.id} to={`/projects/${project.id}`}>
                                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                                    <CardContent className="h-full flex flex-col">
                                        <div className="flex items-center justify-between mb-3">
                                            <Badge variant={getStatusVariant(project.status)} size="sm">
                                                {t(`projectStatus.${project.status.toLowerCase()}`)}
                                            </Badge>
                                            <span className="text-sm text-gray-500">
                                                {formatDate(project.created_at)}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-1">
                                            {project.name}
                                        </h3>

                                        <p className="text-gray-600 mb-4 flex-1 line-clamp-2">
                                            {project.description}
                                        </p>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <Users className="h-4 w-4 mr-1"/>
                                                    {project.members.length} {t('dashboard.members')}
                                                </div>
                                                <div className="flex items-center">
                                                    <Clock className="h-4 w-4 mr-1"/>
                                                    {project.total_hours}h
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <Calendar className="h-4 w-4 mr-1"/>
                                                    {formatDate(project.start_date)}
                                                </div>
                                                {project.end_date && (
                                                    <div className="text-right">
                                                        {t('projects.due')}: {formatDate(project.end_date)}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-2 border-t border-gray-200">
                                                <p className="text-sm text-gray-600">
                                                    {t('projects.owner')}: {project.owner.first_name} {project.owner.last_name}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    // Details View
                    <div className="space-y-3">
                        {projectsData?.data.map((project) => (
                            <Link key={project.id} to={`/projects/${project.id}`}>
                                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                    <CardContent className="py-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                            {/* Project Info - Left Section */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-medium text-gray-900 truncate">
                                                        {project.name}
                                                    </h3>
                                                    <Badge variant={getStatusVariant(project.status)} size="sm">
                                                        {t(`projectStatus.${project.status.toLowerCase()}`)}
                                                    </Badge>
                                                </div>
                                                <p className="text-gray-600 text-sm line-clamp-1 mb-2">
                                                    {project.description}
                                                </p>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center">
                                                        <Users className="h-4 w-4 mr-1"/>
                                                        {project.owner.first_name} {project.owner.last_name}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <Users className="h-4 w-4 mr-1"/>
                                                        {project.members.length} {t('dashboard.members')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Stats - Middle Section */}
                                            <div className="flex items-center gap-6 lg:gap-8">
                                                <div className="text-center">
                                                    <div className="flex items-center text-gray-500 text-sm mb-1">
                                                        <Calendar className="h-4 w-4 mr-1"/>
                                                        <span className="font-medium">{t('projects.start')}</span>
                                                    </div>
                                                    <p className="text-gray-900 font-medium">
                                                        {formatDate(project.start_date)}
                                                    </p>
                                                </div>

                                                {project.end_date && (
                                                    <div className="text-center">
                                                        <div className="flex items-center text-gray-500 text-sm mb-1">
                                                            <Calendar className="h-4 w-4 mr-1"/>
                                                            <span className="font-medium">{t('projects.due')}</span>
                                                        </div>
                                                        <p className="text-gray-900 font-medium">
                                                            {formatDate(project.end_date)}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="text-center">
                                                    <div className="flex items-center text-gray-500 text-sm mb-1">
                                                        <Clock className="h-4 w-4 mr-1"/>
                                                        <span className="font-medium">{t('projects.hours')}</span>
                                                    </div>
                                                    <p className="text-gray-900 font-medium">
                                                        {project.total_hours}h
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Created Date - Right Section */}
                                            <div className="text-sm text-gray-500 lg:text-right">
                                                <span className="block lg:inline">
                                                    {t('projects.created')}: {formatDate(project.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {projectsData && projectsData.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-700">
                            {t('common.showing', {
                                from: projectsData.page * projectsData.size + 1,
                                to: Math.min((projectsData.page + 1) * projectsData.size, projectsData.totalElements),
                                total: projectsData.totalElements
                            })}
                        </p>
                        <div className="flex space-x-2">
                            <Button
                                variant="secondary"
                                disabled={!projectsData.hasPrevious}
                                onClick={() => setPage(page - 1)}
                            >
                                {t('common.previous')}
                            </Button>
                            <Button
                                variant="secondary"
                                disabled={!projectsData.hasNext}
                                onClick={() => setPage(page + 1)}
                            >
                                {t('common.next')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Create Project Modal */}
                <Modal
                    isOpen={showCreateModal}
                    onClose={() => {
                        setShowCreateModal(false);
                        setSelectedCustomerId('');
                    }}
                    title={t('projects.createNewProject')}
                    size="lg"
                >
                    <form onSubmit={handleCreateProject} className="space-y-4">
                        <Input
                            label={t('projects.projectName')}
                            value={createForm.name}
                            onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                            required
                        />

                        <div>
                            <label className="label">{t('projects.description')}</label>
                            <textarea
                                value={createForm.description}
                                onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                                className="input"
                                rows={3}
                                required
                            />
                        </div>

                        <Select
                            label={t('projects.customer')}
                            value={selectedCustomerId}
                            onChange={(e) => handleCustomerChange(e.target.value)}
                            options={[
                                {value: '', label: t('projects.selectCustomer')},
                                ...filteredCustomers.map(c => ({value: c.id, label: c.customer_name}))
                            ]}
                            disabled={ordersLoading}
                        />

                        <Select
                            label={t('projects.order')}
                            value={createForm.order_id}
                            onChange={(e) => handleOrderChange(e.target.value)}
                            options={[
                                {value: '', label: t('projects.selectOrder')},
                                ...filteredOrders.map(o => ({
                                    value: o.id,
                                    label: `${o.order_id || o.id} - ${o.customer.customer_name}${o.description ? ` (${o.description})` : ''}`
                                }))
                            ]}
                            disabled={ordersLoading}
                            required
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label={t('projects.startDate')}
                                type="date"
                                value={createForm.start_date}
                                onChange={(e) => setCreateForm({...createForm, start_date: e.target.value})}
                                required
                            />

                            <Input
                                label={t('projects.endDate')}
                                type="date"
                                value={createForm.end_date}
                                onChange={(e) => setCreateForm({...createForm, end_date: e.target.value})}
                            />
                        </div>

                        {createError && (
                            <p className="text-sm text-red-600" role="alert">{createError}</p>
                        )}

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setSelectedCustomerId('');
                                }}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                loading={createProjectMutation.isPending}
                                disabled={createProjectMutation.isPending || !createForm.name || !createForm.start_date || !createForm.order_id}
                            >
                                {t('projects.createProject')}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        );
    }
;

export default Projects;
