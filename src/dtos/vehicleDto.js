export class VehicleDto {
  /**
   * @param {object} vehicle - L'objet véhicule brut provenant de la base de données.
   */
  constructor(vehicle) {
    this.vehicleId = vehicle.vehicle_id;
    this.modelId = vehicle.model_id;
    this.registration = vehicle.registration;
    this.vin = vehicle.vin;
    this.firstRegistrationDate = vehicle.first_registration_date;
    this.energy = vehicle.energy;
    this.mileage = vehicle.mileage;
    this.currentWheelSize = vehicle.current_wheel_size;
    this.options = vehicle.options;
  }
}
