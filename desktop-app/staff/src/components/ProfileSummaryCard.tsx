import React from 'react';
import { User, Camera, Edit, CheckCircle } from 'lucide-react';
import { StaffProfile } from '../types';

interface ProfileSummaryCardProps {
  profile: StaffProfile;
}

const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({ profile }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-8">
      {/* Profile Picture */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center">
            {profile.profilePicture ? (
              <img
                src={profile.profilePicture}
                alt={profile.fullName}
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <User className="w-16 h-16 text-blue-600" />
            )}
          </div>
          <button className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg">
            <Camera className="w-5 h-5 text-white" />
          </button>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mt-4 text-center">
          {profile.fullName}
        </h2>
        <p className="text-sm text-gray-600">{profile.employeeId}</p>
      </div>

      {/* Profile Details */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Position</label>
          <p className="text-sm text-gray-900 mt-1">{profile.position}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Assigned Office</label>
          <p className="text-sm text-gray-900 mt-1">{profile.office}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Account Status</label>
          <div className="flex items-center space-x-2 mt-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-600">
              {profile.accountStatus.charAt(0).toUpperCase() + profile.accountStatus.slice(1)}
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Last Login</label>
          <p className="text-sm text-gray-900 mt-1">{profile.lastLogin}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Camera className="w-4 h-4" />
          <span className="text-sm font-medium">Change Photo</span>
        </button>
        <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
          <Edit className="w-4 h-4" />
          <span className="text-sm font-medium">Edit Profile</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileSummaryCard;
