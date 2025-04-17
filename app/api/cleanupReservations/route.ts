import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import dayjs from 'dayjs';

export async function DELETE() {
  try {
    // Utilisation de dayjs pour récupérer l'heure actuelle
    const now = dayjs();

    // Recherche des réservations expirées
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        OR: [
          {
            reservationDate: {
              lt: now.format('DD/MM/YYYY'), // Si la date de réservation est inférieure à la date actuelle
            },
          },
          {
            reservationDate: {
              equals: now.format('DD/MM/YYYY'), // Si la date de réservation est égale à la date actuelle
            },
            endTime: {
              lt: now.format('HH:mm'), // Si l'heure de fin est inférieure à l'heure actuelle
            },
          },
        ],
      },
    });

    // Si des réservations expirées sont trouvées, on les supprime
    if (expiredReservations.length > 0) {
      await prisma.reservation.deleteMany({
        where: {
          id: {
            in: expiredReservations.map((reservation) => reservation.id),
          },
        },
      });
    }

    // Retourne une réponse positive indiquant que les réservations expirées ont été nettoyées
    return NextResponse.json({ message: 'Expired reservations cleaned up' });

  } catch (error) {
    // En cas d'erreur, on logge l'erreur et on retourne un message d'erreur avec un code 500
    console.error('Error cleaning up reservations:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
