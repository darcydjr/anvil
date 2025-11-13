# 📚 Component Library

## Metadata
- **Name**: 📚 Component Library
- **Type**: Enabler
- **ID**: ENB-327741
- **Capability ID**: TBD
- **Status**: In Draft
- **Approval**: Not Approved
- **Priority**: Medium
- **Owner**: Product Team
- **Developer**: Development Team
- **Created Date**: 2025-11-12
- **Last Updated**: 2025-11-12
- **Version**: 3.4.39

## Technical Overview
### Purpose
/components/FordComponents';

function App() {
  return (
    <div>
      <Card header="Welcome">
        <Input label="Email" type="email" />
        <Button variant="primary">Submit</Button>
      </Card>
    </div>
  );
}
```

## 📚 Component Library

### Buttons
- **Variants**: primary, secondary, tertiary, danger, success
- **Sizes**: sm, default, lg
- **States**: normal, hover, disabled

```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary btn-lg">Large Secondary</button>
<button class="btn btn-danger btn-sm">Small Danger</button>
```

```jsx
<Button variant="primary">Primary</Button>
<Button variant="secondary" size="lg">Large Secondary</Button>
<Button variant="danger" size="sm">Small Danger</Button>
```

### Form Elements

#### Text Input
```html
<div class="form-group">
    <label class="form-label form-label-required">Email</label>
    <input type="email" class="form-input" placeholder="Enter email">
    <span class="form-help">We'll never share your email</span>
</div>
```

```jsx
<Input 
  label="Email" 
  type="email" 
  required 
  placeholder="Enter email"
  help="We'll never share your email"
/>
```

#### Select
```html
<div class="form-group">
    <label class="form-label">Vehicle Type</label>
    <select class="form-select">
        <option>Select a vehicle type</option>
        <option>Sedan</option>
        <option>SUV</option>
    </select>
</div>
```

```jsx
<Select 
  label="Vehicle Type"
  options={[
    { value: '', label: 'Select a vehicle type' },
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' }
  ]}
/>
```

#### Checkbox & Radio
```html
<div class="form-check">
    <input type="checkbox" class="form-check-input" id="check1">
    <label class="form-check-label" for="check1">Option 1</label>
</div>
```

```jsx
<Checkbox label="Option 1" checked={checked} onChange={handleChange} />
<Radio label="Option A" name="group1" checked={selected} onChange={handleChange} />
```

#### Toggle Switch
```html
<div class="form-switch">
    <label class="switch">
        <input type="checkbox" checked>
        <span class="switch-slider"></span>
    </label>
    <span>Enable notifications</span>
</div>
```

```jsx
<Switch label="Enable notifications" checked={enabled} onChange={handleToggle} />
```

### Cards

```html
<div class="card">
    <div class="card-header">
        <h3>Card Title</h3>
    </div>
    <div class="card-body">
        <p>Card content goes here</p>
    </div>
    <div class="card-footer">
        <button class="btn btn-primary">Action</button>
    </div>
</div>
```

```jsx
<Card 
  header="Card Title"
  footer={<Button>Action</Button>}
>
  <p>Card content goes here</p>
</Card>
```

### Tables

```html
<div class="table-container">
    <table class="table table-striped">
        <thead>
            <tr>
                <th>Model</th>
                <th>Type</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>F-150</td>
                <td>Truck</td>
                <td><span class="badge badge-success">Available</span></td>
            </tr>
        </tbody>
    </table>
</div>
```

```jsx
<Table 
  columns={[
    { key: 'model', label: 'Model', sortable: true },
    { key: 'type', label: 'Type' },
    { 
      key: 'status', 
      label: 'Status',
      render: (value) => <Badge variant="success">{value}</Badge>
    }
  ]}
  data={vehicleData}
  striped
/>
```

### Navigation

#### Sidebar
```html
<div class="sidebar">
    <ul class="nav-list">
        <li class="nav-item">
            <a href="#" class="nav-link active">Dashboard</a>
        </li>
        <li class="nav-item">
            <a href="#" class="nav-link">Vehicles</a>
        </li>
    </ul>
</div>
```

```jsx
<Sidebar 
  items={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Vehicles', href: '/vehicles' }
  ]}
  activeItem={0}
/>
```

#### Breadcrumbs
```html
<nav class="breadcrumb">
    <span class="breadcrumb-item"><a href="#">Home</a></span>
    <span class="breadcrumb-item"><a href="#">Vehicles</a></span>
    <span class="breadcrumb-item active">Explorer</span>
</nav>
```

```jsx
<Breadcrumb items={[
  { label: 'Home', href: '/' },
  { label: 'Vehicles', href: '/vehicles' },
  { label: 'Explorer' }
]} />
```

#### Tabs
```jsx
const [activeTab, setActiveTab] = useState(0);

<Tabs 
  tabs={[
    { label: 'Overview', content: <p>Overview content</p> },
    { label: 'Details', content: <p>Details content</p> }
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

### Badges & Alerts

#### Badges
```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-danger">Danger</span>
```

```jsx
<Badge variant="success">Available</Badge>
<Badge variant="danger">Out of Stock</Badge>
```

#### Alerts
```html
<div class="alert alert-success">
    <div class="alert-title">Success

## Functional Requirements
| FR-001 | **Variants**: primary, secondary, tertiary, danger, success | High | Not Started |
| FR-002 | **Sizes**: sm, default, lg | High | Not Started |

## Non-Functional Requirements
| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| NFR-001 | Performance and scalability | High | Not Started |
| NFR-002 | Security and data protection | High | Not Started |
| NFR-003 | Maintainability and documentation | Medium | Not Started |

*Generated from Discovery analysis*