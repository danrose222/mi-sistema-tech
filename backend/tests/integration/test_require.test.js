const creditosService = require('../../src/services/creditos.service');

describe('Test direct require', () => {
  it('should not be undefined', () => {
    console.log('in test:', creditosService);
    expect(creditosService).toBeDefined();
    expect(creditosService.crearCredito).toBeDefined();
  });
});
