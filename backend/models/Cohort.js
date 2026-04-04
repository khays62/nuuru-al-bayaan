import mongoose from 'mongoose';

const { Schema } = mongoose;

// Dufcad (Cohort) = koox arday ah oo intake isku mid ah, la socda ilaa ay ka qalin-jabiyaan.
// Minimal today: name (unique), startAcademicYear (required), status.
const cohortSchema = new Schema({
  name: { type: String, required: true, trim: true },
  // Auto-incremented order for this academic year (used in studentId).
  orderNumber: { type: Number, min: 1 },
  // AY-ka intake-ka bilowga (wajib)
  startAcademicYear: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active' }
}, { timestamps: true });

// Inta badan magacu waa gaar. Haddii aad rabto in aad isku AY kala duwanaato, 
// waxaa lagu balaarin karaa unique (name + startAcademicYear) mustaqbalka.
cohortSchema.index({ name: 1 }, { unique: true });
cohortSchema.index(
  { startAcademicYear: 1, orderNumber: 1 },
  { unique: true, partialFilterExpression: { orderNumber: { $gt: 0 } } }
);
cohortSchema.index({ status: 1 });

export default mongoose.model('Cohort', cohortSchema);
