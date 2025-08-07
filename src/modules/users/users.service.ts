import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole } from '@core/domain/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PasswordService } from '@shared/utils/password.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private passwordService: PasswordService
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, firstName, lastName, role, phone, address } =
      createUserDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.passwordService.hashPassword(password);

    // Construir el objeto solo con los campos definidos
    const userData: any = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || UserRole.CUSTOMER,
    };
    if (typeof phone !== 'undefined' && phone !== null) {
      userData.phone = phone;
    }
    if (typeof address !== 'undefined' && address !== null) {
      userData.address = address;
    }
    const user = new this.userModel(userData);

    await user.save();

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword as User;
  }

  async findAll(page: number = 1, limit: number = 20, role?: UserRole) {
    const skip = (page - 1) * limit;
    const filter: any = { isDeleted: false };

    if (role) {
      filter.role = role;
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).select('-password');
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email, isDeleted: false });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({
        email: updateUserDto.email,
        _id: { $ne: id },
      });
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Hash password if provided
    if (updateUserDto.password) {
      updateUserDto.password = await this.passwordService.hashPassword(
        updateUserDto.password
      );
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password');

    return updatedUser;
  }

  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto
  ): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({
        email: updateProfileDto.email,
        _id: { $ne: id },
      });
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateProfileDto, { new: true })
      .select('-password');

    return updatedUser;
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userModel.findById(id);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.comparePassword(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      throw new ConflictException('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation =
      this.passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new ConflictException(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`
      );
    }

    // Hash and update new password
    const hashedNewPassword =
      await this.passwordService.hashPassword(newPassword);
    await this.userModel.findByIdAndUpdate(id, { password: hashedNewPassword });
  }

  async deactivate(id: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .select('-password');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async activate(id: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { isActive: true }, { new: true })
      .select('-password');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndUpdate(
      id,
      { isDeleted: true, isActive: false },
      { new: true }
    );

    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async getUserStats() {
    const [totalUsers, activeUsers, adminUsers, customerUsers] =
      await Promise.all([
        this.userModel.countDocuments({ isDeleted: false }),
        this.userModel.countDocuments({ isDeleted: false, isActive: true }),
        this.userModel.countDocuments({
          isDeleted: false,
          role: UserRole.ADMIN,
        }),
        this.userModel.countDocuments({
          isDeleted: false,
          role: UserRole.CUSTOMER,
        }),
      ]);

    return {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      admins: adminUsers,
      customers: customerUsers,
    };
  }

  async searchUsers(query: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(query, 'i');

    const filter = {
      isDeleted: false,
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
      ],
    };

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
