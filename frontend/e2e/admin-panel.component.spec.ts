import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AdminPanelComponent } from './admin-panel.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('AdminPanelComponent', () => {
  let component: AdminPanelComponent;
  let fixture: ComponentFixture<AdminPanelComponent>;
  let router: Router;

  const routerMock = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPanelComponent, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPanelComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to /admin/productos on goProductos()', () => {
    component.goProductos();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/productos']);
  });

  it('should navigate to /admin/usuarios on goUsuarios()', () => {
    component.goUsuarios();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/usuarios']);
  });

  it('should navigate to /admin/pedidos on goPedidos()', () => {
    component.goPedidos();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/pedidos']);
  });
});