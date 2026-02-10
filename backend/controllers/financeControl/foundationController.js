import Donor from '../../models/Donor.js';
import Donation from '../../models/Donation.js';

export const createDonor = async (req, res) => {
    try {
        const donor = new Donor(req.body);
        await donor.save();
        res.status(201).json(donor);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getDonors = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const donors = await Donor.find(query).sort({ name: 1 });
        res.json(donors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createDonation = async (req, res) => {
    try {
        const payload = {
            ...req.body,
            recordedBy: req.user?._id
        };
        const donation = new Donation(payload);
        await donation.save();
        res.status(201).json(donation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getDonations = async (req, res) => {
    try {
        const donations = await Donation.find()
            .sort({ date: -1 })
            .populate('donor', 'name type')
            .populate('project', 'name type')
            .populate('account', 'name type')
            .populate('recordedBy', 'name email');
        res.json(donations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
